import crypto from "node:crypto";
import forge from "node-forge";

/**
 * Lectura de certificados PKCS#12 (.p12/.pfx) emitidos por entidades de certificación de Ecuador
 * (Banco Central, Security Data, ANF, Uanataca, Consejo de la Judicatura, ...).
 *
 * Igual que el worker de firma de SIAI (services/hr-service/signing/sign_contract.py): valida
 * vigencia y uso de clave, y extrae la identificación del titular del serialNumber del sujeto o de
 * las extensiones privadas de las EC ecuatorianas. No valida confianza en la CA ni revocación:
 * eso lo hace el validador del receptor (FirmaEC, Adobe Acrobat).
 */

export class CertificateError extends Error {}

export type CertificateInfo = {
  commonName: string;
  signerId: string | null;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  /** SHA-256 del certificado en hex */
  fingerprint: string;
};

export type LoadedCertificate = {
  privateKey: crypto.KeyObject;
  /** DER del certificado del firmante */
  certDer: Buffer;
  /** DER de los certificados de la cadena (sin el del firmante) */
  chainDer: Buffer[];
  info: CertificateInfo;
};

const toDer = (cert: forge.pki.Certificate) => Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), "binary");

function decodeValue(attr: { value?: unknown; valueTagClass?: number }): string {
  const raw = String(attr.value ?? "");
  if (attr.valueTagClass === forge.asn1.Type.UTF8) {
    try {
      return forge.util.decodeUtf8(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Busca un atributo por nombre corto (CN, O) u OID (2.5.4.5 = serialNumber). */
function field(subject: forge.pki.Certificate["subject"], key: string): string | null {
  const query = /^\d+(\.\d+)+$/.test(key) ? { type: key } : { shortName: key };
  const f = subject.getField(query) as { value?: unknown; valueTagClass?: number } | null;
  return f ? decodeValue(f).trim() : null;
}

/** Cédula/RUC: serialNumber del sujeto (con o sin prefijo) o extensión privada x.3.1 de la EC. */
function extractSignerId(cert: forge.pki.Certificate): string | null {
  const candidates: string[] = [];
  const sn = field(cert.subject, "2.5.4.5");
  if (sn) candidates.push(sn);
  for (const ext of cert.extensions as { id: string; value: string }[]) {
    if (!/^1\.3\.6\.1\.4\.1\.\d+\.3\.(1|11)$/.test(ext.id)) continue;
    try {
      const a = forge.asn1.fromDer(ext.value);
      if (typeof a.value === "string") candidates.push(a.type === forge.asn1.Type.UTF8 ? forge.util.decodeUtf8(a.value) : a.value);
    } catch {
      /* extensión no textual */
    }
  }
  for (const c of candidates) {
    const digits = c.replace(/^(CEDULA|IDCEC|PNOEC|PAS|PASAPORTE|RUC)[-:\s]*/i, "").replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 13) return digits;
  }
  return null;
}

function canSign(cert: forge.pki.Certificate) {
  const ku = cert.getExtension("keyUsage") as { digitalSignature?: boolean; nonRepudiation?: boolean } | null;
  return !ku || !!ku.digitalSignature || !!ku.nonRepudiation;
}

export function loadP12(p12: Buffer, password: string, now = new Date()): LoadedCertificate {
  let pkcs12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12.toString("binary")), false);
    pkcs12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new CertificateError("No se pudo abrir el .p12/.pfx. Revise el archivo y su contraseña.");
  }

  const keyBags = [
    ...(pkcs12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(pkcs12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
  ].filter((b) => b.key);
  const certs = (pkcs12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c);

  if (!keyBags.length) throw new CertificateError("El archivo no contiene una clave privada RSA utilizable.");
  if (!certs.length) throw new CertificateError("El archivo no contiene certificados.");

  // Algunos .p12 traen varias claves/certificados (firma y cifrado): se elige el par cuya
  // clave pública coincide y cuyo uso permite firmar.
  let chosen: { key: forge.pki.rsa.PrivateKey; cert: forge.pki.Certificate } | null = null;
  for (const bag of keyBags) {
    const key = bag.key as forge.pki.rsa.PrivateKey;
    const match = certs.filter((c) => {
      const pub = c.publicKey as forge.pki.rsa.PublicKey;
      return pub?.n && key.n && pub.n.equals(key.n);
    });
    const cert = match.find(canSign) ?? null;
    if (cert) {
      chosen = { key, cert };
      break;
    }
  }
  if (!chosen) throw new CertificateError("Este certificado no permite firmar documentos (uso de clave).");

  const { cert, key } = chosen;
  if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
    throw new CertificateError(
      `El certificado no está vigente (válido del ${cert.validity.notBefore.toLocaleDateString("es-EC")} al ${cert.validity.notAfter.toLocaleDateString("es-EC")}).`,
    );
  }

  const certDer = toDer(cert);
  const chainDer = certs.filter((c) => c !== cert).map(toDer);

  // Red de seguridad: el DER re-serializado debe ser válido para OpenSSL.
  const x509 = new crypto.X509Certificate(certDer);
  for (const der of chainDer) {
    const ca = new crypto.X509Certificate(der);
    if (x509.checkIssued(ca) && !x509.verify(ca.publicKey)) {
      throw new CertificateError("No se pudo reconstruir el certificado del firmante sin alterarlo.");
    }
  }

  const privateKey = crypto.createPrivateKey(forge.pki.privateKeyToPem(key));
  const issuer = field(cert.issuer, "CN") ?? field(cert.issuer, "O") ?? "Entidad desconocida";
  return {
    privateKey,
    certDer,
    chainDer,
    info: {
      commonName: field(cert.subject, "CN") ?? "Firmante",
      signerId: extractSignerId(cert),
      issuer,
      serialNumber: cert.serialNumber,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      fingerprint: crypto.createHash("sha256").update(certDer).digest("hex"),
    },
  };
}
