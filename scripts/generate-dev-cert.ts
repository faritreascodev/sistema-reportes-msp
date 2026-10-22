/**
 * Genera un certificado PKCS#12 AUTOFIRMADO solo para pruebas locales del flujo de firma.
 *   npm run cert:dev  ->  storage/dev-cert/firma-prueba.p12  (contraseña: prueba123)
 *
 * Imita la estructura de un certificado de persona natural de una EC ecuatoriana
 * (CA intermedia + titular con serialNumber = cédula, keyUsage digitalSignature/nonRepudiation,
 * cifrado 3DES como los .p12 del BCE/Security Data). No tiene validez legal.
 */
import fs from "node:fs";
import path from "node:path";
import forge from "node-forge";

export const DEV_CERT_PASSWORD = "prueba123";

function makeCert(opts: {
  subject: forge.pki.CertificateField[];
  issuer: forge.pki.CertificateField[];
  publicKey: forge.pki.PublicKey;
  signKey: forge.pki.rsa.PrivateKey;
  ca: boolean;
  serial: string;
  years: number;
}) {
  const cert = forge.pki.createCertificate();
  cert.publicKey = opts.publicKey;
  cert.serialNumber = opts.serial;
  cert.validity.notBefore = new Date(Date.now() - 60 * 60 * 1000);
  cert.validity.notAfter = new Date(Date.now() + opts.years * 365 * 24 * 60 * 60 * 1000);
  cert.setSubject(opts.subject);
  cert.setIssuer(opts.issuer);
  cert.setExtensions(
    opts.ca
      ? [
          { name: "basicConstraints", cA: true },
          { name: "keyUsage", keyCertSign: true, cRLSign: true },
          { name: "subjectKeyIdentifier" },
        ]
      : [
          { name: "basicConstraints", cA: false },
          { name: "keyUsage", digitalSignature: true, nonRepudiation: true },
          { name: "extKeyUsage", emailProtection: true },
          { name: "subjectKeyIdentifier" },
        ],
  );
  cert.sign(opts.signKey, forge.md.sha256.create());
  return cert;
}

export function generateDevP12(commonName = "MARIA DE LAS MERCEDES TORRES ESCOBAR", cedula = "0800000000") {
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const userKeys = forge.pki.rsa.generateKeyPair(2048);
  const caSubject = [
    { name: "commonName", value: "AUTORIDAD DE CERTIFICACION DE PRUEBAS - NO VALIDA" },
    { name: "organizationName", value: "SISTEMA DE REPORTES MSP (DESARROLLO)" },
    { name: "countryName", value: "EC" },
  ];
  const ca = makeCert({ subject: caSubject, issuer: caSubject, publicKey: caKeys.publicKey, signKey: caKeys.privateKey, ca: true, serial: "01", years: 5 });
  const user = makeCert({
    subject: [
      { name: "commonName", value: commonName },
      { name: "serialNumber", value: cedula },
      { name: "organizationName", value: "PERSONA NATURAL" },
      { name: "countryName", value: "EC" },
    ],
    issuer: caSubject,
    publicKey: userKeys.publicKey,
    signKey: caKeys.privateKey,
    ca: false,
    serial: "1a2b3c4d",
    years: 2,
  });
  const p12 = forge.pkcs12.toPkcs12Asn1(userKeys.privateKey, [user, ca], DEV_CERT_PASSWORD, {
    algorithm: "3des",
    friendlyName: commonName,
  });
  return Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary");
}

if (require.main === module) {
  const out = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage", "dev-cert", "firma-prueba.p12");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, generateDevP12());
  console.log(`Certificado de PRUEBA generado en ${out}\nContraseña: ${DEV_CERT_PASSWORD}`);
}
