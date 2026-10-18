import { staff } from "@/lib/auth";
import { syncCalendar } from "@/lib/google";
import { safeEqual } from "@/lib/crypto";
export const maxDuration = 180;
async function run() {
  try {
    return Response.json(await syncCalendar(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Sincronización incompleta. Revisa Configuración." },
      { status: 503 },
    );
  }
}
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    !safeEqual(
      request.headers.get("authorization") ?? "",
      `Bearer ${process.env.CRON_SECRET}`,
    )
  )
    return new Response(null, { status: 401 });
  return run();
}
export async function POST(request: Request) {
  await staff(true);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  return run();
}
