import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import { generateDevP12, DEV_CERT_PASSWORD } from "../scripts/generate-dev-cert";
import { CertificateError, loadP12 } from "../src/lib/server/signing/p12";
import { signPdf } from "../src/lib/server/signing/sign-pdf";
import { verifyPdfSignatures } from "../src/lib/server/signing/verify";

async function blankPdf(pages = 2) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([595.28, 841.89]).drawText(`Página ${i + 1}`.replace("á", "a"), { x: 50, y: 800 });
  return Buffer.from(await doc.save());
}

const slot = { page: 1, x: 402.9, y: 219.6, width: 135.5, height: 55.2 };

describe("firma electrónica PKCS#12", () => {
  let p12: Buffer;
  let pdf: Buffer;
  before(async () => {
    p12 = generateDevP12("MARÍA DE LAS MERCEDES TORRES ESCOBAR", "0801234567");
    pdf = await blankPdf();
  });

  it("lee titular, cédula y emisor del .p12", () => {
    const { info, chainDer } = loadP12(p12, DEV_CERT_PASSWORD);
    assert.equal(info.commonName, "MARÍA DE LAS MERCEDES TORRES ESCOBAR");
    assert.equal(info.signerId, "0801234567");
    assert.match(info.issuer, /AUTORIDAD DE CERTIFICACION/);
    assert.equal(chainDer.length, 1);
  });

  it("rechaza contraseña incorrecta y archivos que no son .p12", () => {
    assert.throws(() => loadP12(p12, "incorrecta"), CertificateError);
    assert.throws(() => loadP12(Buffer.from("no es un certificado"), DEV_CERT_PASSWORD), CertificateError);
  });

  it("rechaza certificados vencidos", () => {
    const future = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);
    assert.throws(() => loadP12(p12, DEV_CERT_PASSWORD, future), /no está vigente/);
  });

  for (const subFilter of ["adbe.pkcs7.detached", "ETSI.CAdES.detached"]) {
    it(`firma y verifica (${subFilter})`, async () => {
      const res = await signPdf(pdf, p12, DEV_CERT_PASSWORD, { slot, subFilter });
      const sigs = verifyPdfSignatures(res.pdf);
      assert.equal(sigs.length, 1);
      const [s] = sigs;
      assert.equal(s.subFilter, subFilter);
      assert.ok(s.coversWholeFile, "el ByteRange debe cubrir todo el archivo");
      assert.ok(s.digestOk, "messageDigest");
      assert.ok(s.signatureOk, "firma RSA de atributos");
      assert.equal(s.essCertOk, true, "signingCertificateV2");
      assert.equal(s.signingTime === null, subFilter === "ETSI.CAdES.detached");
      assert.match(s.signerSubject, /TORRES ESCOBAR/);
      // la estampa y el widget están en la página 2
      const doc = await PDFDocument.load(res.pdf);
      assert.equal(doc.getPageCount(), 2);
    });
  }

  it("detecta alteraciones posteriores a la firma", async () => {
    const res = await signPdf(pdf, p12, DEV_CERT_PASSWORD, { slot });
    const tampered = Buffer.from(res.pdf);
    const i = tampered.indexOf("Page");
    tampered[i] = "X".charCodeAt(0);
    assert.equal(verifyPdfSignatures(tampered)[0].digestOk, false);
  });
});
