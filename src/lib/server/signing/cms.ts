import crypto from "node:crypto";
import forge from "node-forge";
import { Signer } from "@signpdf/utils";
import type { LoadedCertificate } from "./p12";

/**
 * CMS SignedData (RFC 5652) desacoplado para el diccionario /Sig del PDF.
 *
 * node-forge no permite atributos firmados personalizados, así que la estructura se arma a mano:
 *   - contentType, messageDigest (SHA-256 del ByteRange)
 *   - signingTime (sólo en adbe.pkcs7.detached; PAdES lo prohíbe y usa /M del diccionario)
 *   - signingCertificateV2 (ESS, RFC 5035): enlaza el certificado del firmante con la firma.
 *     Es obligatorio para PAdES-B y lo revisan FirmaEC y Adobe.
 * La firma RSA PKCS#1 v1.5 / SHA-256 se calcula con node:crypto.
 */

const { asn1 } = forge;
const C = asn1.Class;
const T = asn1.Type;

const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
};

type Node = forge.asn1.Asn1;
const oid = (o: string) => asn1.create(C.UNIVERSAL, T.OID, false, asn1.oidToDer(o).getBytes());
const seq = (v: Node[]) => asn1.create(C.UNIVERSAL, T.SEQUENCE, true, v);
const set = (v: Node[]) => asn1.create(C.UNIVERSAL, T.SET, true, v);
const octets = (b: Buffer) => asn1.create(C.UNIVERSAL, T.OCTETSTRING, false, b.toString("binary"));
const int = (n: number) => asn1.create(C.UNIVERSAL, T.INTEGER, false, asn1.integerToDer(n).getBytes());
const nul = () => asn1.create(C.UNIVERSAL, T.NULL, false, "");
const fromDer = (b: Buffer) => asn1.fromDer(forge.util.createBuffer(b.toString("binary")));
const der = (n: Node) => Buffer.from(asn1.toDer(n).getBytes(), "binary");
const algo = (o: string, withNull = true) => seq(withNull ? [oid(o), nul()] : [oid(o)]);

function utcTime(date: Date) {
  return asn1.create(C.UNIVERSAL, T.UTCTIME, false, asn1.dateToUtcTime(date));
}

/** tbsCertificate -> issuer (Name) y serialNumber, tal como están en el DER. */
function issuerAndSerial(certDer: Buffer) {
  const cert = fromDer(certDer);
  const tbs = (cert.value as Node[])[0].value as Node[];
  const hasVersion = tbs[0].tagClass === C.CONTEXT_SPECIFIC;
  const serial = tbs[hasVersion ? 1 : 0];
  const issuer = tbs[hasVersion ? 3 : 2];
  return { issuer, serial };
}

function attribute(type: string, value: Node) {
  return seq([oid(type), set([value])]);
}

/** DER SET OF: los elementos deben ir ordenados por su codificación. */
function derSetOf(items: Node[]) {
  const sorted = items.map(der).sort(Buffer.compare);
  return sorted.map(fromDer);
}

export type CmsOptions = { cades: boolean };

export function buildDetachedCms(content: Buffer, cert: LoadedCertificate, signingTime: Date, opts: CmsOptions): Buffer {
  const digest = crypto.createHash("sha256").update(content).digest();
  const certHash = crypto.createHash("sha256").update(cert.certDer).digest();
  const { issuer, serial } = issuerAndSerial(cert.certDer);

  // ESSCertIDv2 con sha256 (algoritmo por defecto => se omite) + IssuerSerial
  const issuerSerial = seq([seq([asn1.create(C.CONTEXT_SPECIFIC, 4, true, [issuer])]), serial]);
  const signingCertV2 = seq([seq([seq([octets(certHash), issuerSerial])])]);

  const attrs = [
    attribute(OID.contentType, oid(OID.data)),
    ...(opts.cades ? [] : [attribute(OID.signingTime, utcTime(signingTime))]),
    attribute(OID.messageDigest, octets(digest)),
    attribute(OID.signingCertificateV2, signingCertV2),
  ];
  const sortedAttrs = derSetOf(attrs);
  // Se firma la codificación como SET (0x31); en SignerInfo va como [0] IMPLICIT.
  const signature = crypto.sign("sha256", der(set(sortedAttrs)), cert.privateKey);

  const signerInfo = seq([
    int(1),
    seq([issuer, serial]),
    algo(OID.sha256),
    asn1.create(C.CONTEXT_SPECIFIC, 0, true, sortedAttrs),
    algo(OID.rsaEncryption),
    octets(signature),
  ]);

  const certificates = asn1.create(C.CONTEXT_SPECIFIC, 0, true, [cert.certDer, ...cert.chainDer].map(fromDer));
  const signedData = seq([
    int(1),
    set([algo(OID.sha256)]),
    seq([oid(OID.data)]),
    certificates,
    set([signerInfo]),
  ]);
  return der(seq([oid(OID.signedData), asn1.create(C.CONTEXT_SPECIFIC, 0, true, [signedData])]));
}

/** Adaptador para @signpdf/signpdf: recibe el contenido del ByteRange y devuelve el CMS. */
export class CmsSigner extends Signer {
  constructor(
    private readonly cert: LoadedCertificate,
    private readonly opts: CmsOptions,
  ) {
    super();
  }

  async sign(pdfBuffer: Buffer, signingTime?: Date): Promise<Buffer> {
    return buildDetachedCms(pdfBuffer, this.cert, signingTime ?? new Date(), this.opts);
  }
}
