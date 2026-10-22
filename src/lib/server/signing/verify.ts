import crypto from "node:crypto";
import forge from "node-forge";

/**
 * Verificación criptográfica de la(s) firma(s) de un PDF: integridad del ByteRange, messageDigest,
 * signingCertificateV2 y firma RSA de los atributos firmados. No valida la cadena de confianza.
 */

const { asn1 } = forge;
type Node = forge.asn1.Asn1;

export type VerifiedSignature = {
  subFilter: string | null;
  coversWholeFile: boolean;
  digestOk: boolean;
  signatureOk: boolean;
  essCertOk: boolean | null;
  signerSubject: string;
  signingTime: Date | null;
};

const der = (n: Node) => Buffer.from(asn1.toDer(n).getBytes(), "binary");
const oidOf = (n: Node) => asn1.derToOid(n.value as string);

export function verifyPdfSignatures(pdf: Buffer): VerifiedSignature[] {
  const text = pdf.toString("latin1");
  const out: VerifiedSignature[] = [];
  const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  for (const m of text.matchAll(re)) {
    const [a, b, c, d] = m.slice(1).map(Number);
    const signedContent = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)]);
    const hex = pdf.subarray(a + b + 1, c - 1).toString("latin1").replace(/0+$/, "");
    const cms = Buffer.from(hex.length % 2 ? hex + "0" : hex, "hex");
    const dictStart = text.lastIndexOf("<<", m.index);
    const subFilter = /\/SubFilter\s*\/([\w.]+)/.exec(text.slice(dictStart, c))?.[1] ?? null;

    const root = asn1.fromDer(forge.util.createBuffer(cms.toString("binary")), { strict: false, parseAllBytes: false } as unknown as boolean);
    const signedData = ((root.value as Node[])[1].value as Node[])[0].value as Node[];
    const certsNode = signedData.find((n) => n.tagClass === asn1.Class.CONTEXT_SPECIFIC && n.type === 0)!;
    const signerInfo = ((signedData[signedData.length - 1].value as Node[])[0].value as Node[]);
    const attrsNode = signerInfo.find((n) => n.tagClass === asn1.Class.CONTEXT_SPECIFIC && n.type === 0)!;
    const signature = Buffer.from(signerInfo[signerInfo.length - 1].value as string, "binary");

    const certDers = (certsNode.value as Node[]).map(der);
    const sid = signerInfo[1].value as Node[];
    const sidDer = Buffer.concat([der(sid[0]), der(sid[1])]);
    // Certificado del firmante = el que coincide con issuerAndSerialNumber
    const signerDer =
      certDers.find((cd) => {
        const tbs = ((asn1.fromDer(forge.util.createBuffer(cd.toString("binary"))).value as Node[])[0].value as Node[]);
        const off = tbs[0].tagClass === asn1.Class.CONTEXT_SPECIFIC ? 1 : 0;
        return Buffer.concat([der(tbs[off + 2]), der(tbs[off])]).equals(sidDer);
      }) ?? certDers[0];
    const x509 = new crypto.X509Certificate(signerDer);

    let messageDigest: Buffer | null = null;
    let signingTime: Date | null = null;
    let essCertOk: boolean | null = null;
    for (const attr of attrsNode.value as Node[]) {
      const [typeNode, values] = attr.value as Node[];
      const type = oidOf(typeNode);
      const v = (values.value as Node[])[0];
      if (type === "1.2.840.113549.1.9.4") messageDigest = Buffer.from(v.value as string, "binary");
      if (type === "1.2.840.113549.1.9.5") signingTime = asn1.utcTimeToDate(v.value as string);
      if (type === "1.2.840.113549.1.9.16.2.47") {
        const essId = ((v.value as Node[])[0].value as Node[])[0].value as Node[];
        const hashNode = essId.find((n) => n.type === asn1.Type.OCTETSTRING)!;
        essCertOk = Buffer.from(hashNode.value as string, "binary").equals(crypto.createHash("sha256").update(signerDer).digest());
      }
    }
    const signedAttrs = der(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, attrsNode.value as Node[]));
    out.push({
      subFilter,
      coversWholeFile: c + d === pdf.length,
      digestOk: !!messageDigest && messageDigest.equals(crypto.createHash("sha256").update(signedContent).digest()),
      signatureOk: crypto.verify("sha256", signedAttrs, x509.publicKey, signature),
      essCertOk,
      signerSubject: x509.subject,
      signingTime,
    });
  }
  return out;
}
