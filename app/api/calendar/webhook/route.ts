import { after } from "next/server";
import { syncCalendar } from "@/lib/google";
export const maxDuration = 180;
import { service } from "@/lib/supabase";
import { safeEqual } from "@/lib/crypto";
export async function POST(request: Request) {
  const client = service();
  const { data: c } = await client
    .from("calendar_connection")
    .select("channel_id,channel_token,resource_id")
    .eq("id", 1)
    .single();
  if (
    !c ||
    request.headers.get("x-goog-channel-id") !== c.channel_id ||
    request.headers.get("x-goog-resource-id") !== c.resource_id ||
    !safeEqual(
      request.headers.get("x-goog-channel-token") ?? "",
      c.channel_token ?? "",
    )
  )
    return new Response(null, { status: 403 });
  const { error } = await client
    .from("calendar_connection")
    .update({ needs_pull: true })
    .eq("id", 1);
  if (error) return new Response(null, { status: 503 });
  after(async () => {
    try {
      await syncCalendar();
    } catch {
      /* polling retry */
    }
  });
  return new Response(null, { status: 204 });
}
