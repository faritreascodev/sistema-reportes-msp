import crypto from "node:crypto";
import signpdf from "@signpdf/signpdf";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { SUBFILTER_ADOBE_PKCS7_DETACHED, SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { PDFDocument } from "pdf-lib";
import { CmsSigner } from "./cms";
import { CertificateError, loadP12, type CertificateInfo } from "./p12";
import { drawSignatureStamp, type StampRect } from "./stamp";

export { CertificateError };

export type SignOptions = {
  /** Celda FIRMA (coordenadas PDF) donde va la estampa */
  slot: StampRect & { page: number };
  reason?: string;
  location?: string;
  contactInfo?: string;
  subFilter?: string;
  signingTime?: Date;
};

export type SignResult = { pdf: Buffer; info: CertificateInfo; subFilter: string; sha256: string; signedAt: Date };

const SIGNATURE_LENGTH = 16384;

/**
 * Firma un PDF con un certificado PKCS#12:
 *   1. valida el certificado (vigencia, uso de clave) y extrae titular / cédula / emisor,
 *   2. dibuja la estampa con QR en la celda FIRMA del responsable,
 *   3. agrega el diccionario /Sig con /ByteRange y el widget sobre la estampa,
 *   4. calcula el CMS (SHA-256 con RSA) e inserta la firma en /Contents.
 */
export async function signPdf(pdf: Buffer, p12: Buffer, password: string, opts: SignOptions): Promise<SignResult> {
  const signedAt = opts.signingTime ?? new Date();
  const cert = loadP12(p12, password, signedAt);
  const reason = opts.reason ?? process.env.SIGN_REASON ?? "Reporte de verificable de actividades de promoción";
  const location = opts.location ?? process.env.SIGN_LOCATION ?? "Esmeraldas, Ecuador";
  const contactInfo = opts.contactInfo ?? process.env.SIGN_CONTACT ?? "";
  const subFilter =
    (opts.subFilter ?? process.env.SIGN_SUBFILTER) === SUBFILTER_ETSI_CADES_DETACHED
      ? SUBFILTER_ETSI_CADES_DETACHED
      : SUBFILTER_ADOBE_PKCS7_DETACHED;

  const pdfDoc = await PDFDocument.load(pdf);
  const page = pdfDoc.getPage(opts.slot.page);
  const stamp = await drawSignatureStamp(pdfDoc, page, opts.slot, cert.info, signedAt, reason, location);

  pdflibAddPlaceholder({
    pdfDoc,
    pdfPage: page,
    reason,
    contactInfo,
    name: cert.info.commonName,
    location,
    signingTime: signedAt,
    signatureLength: SIGNATURE_LENGTH,
    subFilter,
    widgetRect: [stamp.x, stamp.y, stamp.x + stamp.width, stamp.y + stamp.height],
    appName: "Sistema de Reportes MSP",
  });
  pdfDoc.setModificationDate(signedAt);
  const withPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

  const signer = new CmsSigner(cert, { cades: subFilter === SUBFILTER_ETSI_CADES_DETACHED });
  const signed = await signpdf.sign(withPlaceholder, signer, signedAt);
  return {
    pdf: signed,
    info: cert.info,
    subFilter,
    signedAt,
    sha256: crypto.createHash("sha256").update(signed).digest("hex"),
  };
}
