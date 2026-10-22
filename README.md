# Sistema de Reportes de Promoción · MSP

Automatiza el **REPORTE DE VERIFICABLE DE ACTIVIDADES DE PROMOCIÓN** (Ministerio de Salud Pública, Centro de Salud Tipo B N1):
formulario editable, historial con versiones, recorte de imágenes, exportación **Word (.docx)** y **PDF** idénticos a la plantilla
oficial, y **firma electrónica** con certificado `.p12/.pfx` (FirmaEC, BCE, Security Data, ANF, Uanataca…).

## Inicio rápido (local, sin dependencias externas)

Requisitos: Node.js 22 o superior.

```bash
npm run setup      # instala dependencias, crea la base SQLite y carga 4 reportes reales de ejemplo
npm run dev        # http://localhost:3100
```

> El puerto es **3100** (el 3000 suele estar ocupado por Docker Desktop).

Con Docker:

```bash
docker compose up -d --build   # http://localhost:3100 (datos persistentes en el volumen reportes-data)
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run db:seed` | Reinicia la base con los datos de ejemplo (borra lo existente) |
| `npm run cert:dev` | Crea un certificado **de prueba** en `storage/dev-cert/firma-prueba.p12` (clave `prueba123`) |
| `npm test` | Tests de firma (PKCS#12/CMS) y de exportación DOCX/PDF (requiere la base sembrada) |
| `npm run build && npm start` | Producción |
| `npx tsx scripts/prepare-template.ts <reporte.docx>` | Regenera la plantilla a partir de otro reporte oficial |

## Funcionalidades

- **Editor** con todos los campos editables: nombre de archivo, encabezado, membrete institucional, componente, tema,
  fecha (selector → `11 DE SEPTIEMBRE DE 2026`), lugar, hora (asistente `07:45 a.m. - 08:00 a.m.`), técnica,
  responsables (hasta 4) y actividad coordinada Sí/No (hasta 3 personas).
- **Vista previa en vivo**: es el mismo HTML que se convierte a PDF, por lo que lo que se ve es lo que se descarga.
- **Imágenes**: hoja de registro de participantes + 4 fotos (grilla 2×2). Arrastrar/soltar, recorte con Cropper.js
  (relación 4:3/libre/…, rotación, enderezado, volteo, zoom), calidad JPEG y resolución máxima. Se guarda el original
  para poder re-recortar. Todo se normaliza con `sharp` (orientación EXIF, mozjpeg).
- **Historial**: búsqueda por tema/archivo, filtros por componente, estado, mes/año y rango de fechas; acciones Editar,
  Duplicar, DOCX, PDF, Firmar y Eliminar.
- **Versionado**: *Guardar* sobrescribe la versión actual; *Guardar como vN+1* crea una instantánea nueva. Cualquier
  versión se puede abrir en el editor o descargar en DOCX/PDF.
- **Firma electrónica**: estampa con QR + "Firmado electrónicamente por" en la celda FIRMA del responsable y firma
  criptográfica en el diccionario `/Sig` del PDF. Descarga con sufijo `-signed.pdf` y registro de cada firma.

## Arquitectura

```
src/
  app/                     Next.js 16 (App Router)
    page.tsx               Historial
    reportes/nuevo|[id]    Editor
    api/reportes           CRUD, versiones, duplicar, /docx, /pdf, /firmar
    api/exportar/[fmt]     Exporta lo que hay en el editor sin guardar
    api/imagenes           Subida/optimización y servicio de imágenes
    api/firmas/[id]        Descarga y verificación de PDF firmados
  components/              UI (estilo shadcn), editor, cropper, diálogo de firma
  lib/
    report-types.ts        Esquema zod compartido cliente/servidor
    report-html.ts         Maquetación A4 del reporte (medidas tomadas del .docx oficial)
    server/docx.ts         Word desde templates/plantilla-promocion.docx (membrete/pie/estilos originales)
    server/pdf.ts          PDF con Puppeteer + coordenadas de las celdas FIRMA
    server/signing/        p12.ts (lectura PKCS#12), cms.ts (CMS/PKCS#7), stamp.ts (estampa QR),
                           sign-pdf.ts (orquestación), verify.ts (verificación)
prisma/schema.prisma       Report, ReportVersion, ImageAsset, Signature (SQLite)
storage/                   Base de datos, imágenes y PDF firmados (no se versiona)
```

### Fidelidad del documento

- **DOCX**: se parte del `.docx` oficial (`templates/plantilla-promocion.docx`): encabezado con escudo, "Ministerio de
  Salud Pública", barras azules, pie con logos y estilos (Arial / Cambria) son los originales. El cuerpo se escribe con
  los mismos anchos en twips (tabla 2780/7581, fotos 4815/4827, responsables 3330/3630/2710, coordinación
  2380/2100/2399/2781), salto de página antes del registro fotográfico e imágenes ajustadas al margen.
- **PDF**: HTML con las mismas medidas (márgenes 43.5/20/29.3 mm, posiciones EMU de logos convertidas a mm),
  impreso por Chromium. En Docker se instalan fuentes métricamente compatibles (Liberation Sans ≈ Arial, Caladea ≈ Cambria).

### Firma electrónica (mismo enfoque que SIAI)

Equivalente a `backed-siai/services/hr-service` (`electronic-signature.ts` con `@signpdf` y el worker pyHanko), pero
100 % en Node:

1. `node-forge` abre el `.p12/.pfx` (3DES/RC2/AES), elige el par clave/certificado que permite firmar
   (`digitalSignature`/`nonRepudiation`), valida vigencia y extrae titular, cédula (serialNumber o extensión de la EC) y emisor.
2. `pdf-lib` dibuja la estampa (QR con firmante, razón, ubicación y fecha ISO con zona) en la celda FIRMA y
   `@signpdf/placeholder-pdf-lib` agrega `/Sig` con `/ByteRange` y el widget sobre la estampa.
3. `cms.ts` construye el CMS SignedData desacoplado: SHA-256 con RSA, `contentType`, `messageDigest`,
   `signingCertificateV2` (ESS, requerido por PAdES) y la cadena de certificados. Se elige
   `adbe.pkcs7.detached` (lo que produce FirmaEC) o `ETSI.CAdES.detached` (PAdES-B, sin `signingTime`).
4. `@signpdf/signpdf` inserta la firma en `/Contents`.

Verificado con pyHanko (la librería del worker de SIAI): *intact / valid / trusted / ENTIRE_FILE* en ambos formatos.
El certificado y la contraseña sólo existen en memoria durante la petición; no se guardan ni se registran.

> La confianza en la CA y el estado de revocación los evalúa el validador del receptor (FirmaEC, Adobe Acrobat).
> El certificado de `npm run cert:dev` es autofirmado y sólo sirve para pruebas.

## Configuración (`.env`)

Ver `.env.example`: `DATABASE_URL`, `STORAGE_DIR`, `TZ`, `SIGN_LOCATION`, `SIGN_REASON`, `SIGN_CONTACT`,
`SIGN_SUBFILTER` y opcionalmente `PUPPETEER_EXECUTABLE_PATH`.
