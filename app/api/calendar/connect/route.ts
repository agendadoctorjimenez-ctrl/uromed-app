import { staff } from "@/lib/auth";
import { appUrl } from "@/lib/google";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
export async function GET() {
  const { user } = await staff(true);
  const state = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set("google_oauth", JSON.stringify({ state, user: user.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${appUrl()}/api/calendar/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return Response.redirect(url, 303);
}
