import "server-only";
import { db } from "./supabase";
import { redirect } from "next/navigation";
export async function staff(doctor = false) {
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await client
    .from("profiles")
    .select("id,name,role,active")
    .eq("id", user.id)
    .single();
  if (!profile?.active) redirect("/login?error=Sin%20perfil%20activo");
  if (doctor && profile.role !== "medico")
    throw new Error("Acceso reservado al médico.");
  return { client, user, profile };
}
