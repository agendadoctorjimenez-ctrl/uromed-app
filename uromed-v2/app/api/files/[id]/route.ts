import { staff } from "@/lib/auth";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { client } = await staff(true);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return new Response("No encontrado", { status: 404 });
  const { data: file } = await client
    .from("clinical_files")
    .select("object_path")
    .eq("id", id)
    .single();
  if (!file) return new Response("No encontrado", { status: 404 });
  const { data, error } = await client.storage
    .from("clinical")
    .createSignedUrl(file.object_path, 60);
  if (error || !data) return new Response("No disponible", { status: 503 });
  return new Response(null, {
    status: 303,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
