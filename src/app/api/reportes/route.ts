import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { createReport, listComponentes, listReports } from "@/lib/server/reports";
import { reportDataSchema } from "@/lib/report-types";

export const runtime = "nodejs";

/** GET /api/reportes?q=&componente=&status=&desde=&hasta=&mes=yyyy-mm */
export const GET = handle(async (req: NextRequest) => {
  const session = await getSession();
  const p = req.nextUrl.searchParams;
  const get = (k: string) => p.get(k) || undefined;

  // Si es un usuario estándar, solo ve sus reportes
  const filterUserId = session && session.role !== "ADMIN" ? session.userId : undefined;

  const [items, componentes] = await Promise.all([
    listReports({
      q: get("q"),
      componente: get("componente"),
      status: get("status"),
      desde: get("desde"),
      hasta: get("hasta"),
      mes: get("mes"),
      userId: filterUserId,
    }),
    listComponentes(),
  ]);
  return NextResponse.json({ items, componentes });
});

export const POST = handle(async (req: NextRequest) => {
  const session = await getSession();
  const body = await req.json();
  const data = reportDataSchema.parse(body.data ?? body);
  const report = await createReport(data, session?.userId, typeof body.note === "string" ? body.note : undefined);
  return NextResponse.json(report, { status: 201 });
});
