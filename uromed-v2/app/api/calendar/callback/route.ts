import { staff } from "@/lib/auth";
import { service } from "@/lib/supabase";
import { appUrl, tokenRequest } from "@/lib/google";
import { encrypt, safeEqual } from "@/lib/crypto";
import { cookies } from "next/headers";
export async function GET(request: Request) {
  const { user } = await staff(true);
  const url = new URL(request.url);
  const jar = await cookies();
  const stored = jar.get("google_oauth")?.value;
  jar.delete("google_oauth");
  if (!stored)
    return new Response("La autorización expiró. Vuelve a conectar.", {
      status: 400,
    });
  let pending: { state: string; user: string };
  try {
    pending = JSON.parse(stored);
  } catch {
    return new Response("Estado inválido", { status: 400 });
  }
  if (
    pending.user !== user.id ||
    !safeEqual(url.searchParams.get("state") ?? "", pending.state)
  )
    return new Response("Estado inválido", { status: 400 });
  if (url.searchParams.get("error") || !url.searchParams.get("code"))
    return Response.redirect(
      `${appUrl()}/sistema/configuracion?google=cancelado`,
      303,
    );
  try {
    const client = service();
    const { data: existing } = await client
      .from("calendar_connection")
      .select("id")
      .eq("id", 1)
      .maybeSingle();
    if (existing)
      return new Response(
        "Ya existe una conexión. Desconecta desde Supabase antes de cambiar de cuenta; conserva primero el respaldo.",
        { status: 409 },
      );
    const token = await tokenRequest({
      grant_type: "authorization_code",
      code: url.searchParams.get("code")!,
      redirect_uri: `${appUrl()}/api/calendar/callback`,
    });
    if (!token.refresh_token) throw new Error("Sin refresh token");
    const { error } = await client
      .from("calendar_connection")
      .insert({ id: 1, encrypted_refresh_token: encrypt(token.refresh_token) });
    if (error) throw error;
    return Response.redirect(
      `${appUrl()}/sistema/configuracion?google=conectado`,
      303,
    );
  } catch {
    return new Response(
      "No se pudo conectar Google. Revisa el cliente OAuth y vuelve a intentar.",
      { status: 502 },
    );
  }
}
