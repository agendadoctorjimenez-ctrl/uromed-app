"use server";
import { db } from "@/lib/supabase";
import { staff } from "@/lib/auth";
import { modules } from "@/lib/modules";
import { validate } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { syncCalendar } from "@/lib/google";
export type Result = { error?: string; success?: string };
export async function login(_: Result, form: FormData): Promise<Result> {
  const client = await db();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    return {
      error: "No se pudo ingresar. Revisa los datos e inténtalo de nuevo.",
    };
  const { data: role } = await client.rpc("current_staff_role");
  if (!role) {
    await client.auth.signOut();
    return { error: "La cuenta no tiene un perfil autorizado activo." };
  }
  redirect("/sistema");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/login");
}
export async function save(
  module: string,
  id: string | undefined,
  _: Result,
  form: FormData,
): Promise<Result> {
  const config = modules[module];
  if (!config) return { error: "Módulo desconocido" };
  const { client, profile } = await staff(
    config.doctor || module === "inventario",
  );
  try {
    const data = validate(module, form);
    if (id) z.string().uuid().parse(id);
    if (["vacunas", "zoladex"].includes(module)) {
      if (id) throw new Error("Las aplicaciones confirmadas son inmutables.");
      const key = z.string().uuid().parse(form.get("idempotency_key"));
      const { error } = await client.rpc("record_application", {
        p_patient: data.patient_id,
        p_lot: data.lot_id,
        p_kind: module === "vacunas" ? "vacuna" : "zoladex",
        p_dose: data.dose,
        p_at: data.applied_at,
        p_next: data.next_date,
        p_responsible: data.responsible,
        p_key: key,
      });
      if (error) throw error;
    } else {
      if (id && module === "inventario")
        throw new Error("Utiliza un movimiento de inventario.");
      if (module === "notas" && !id) data.author_id = profile.id;
      const query = id
        ? client.from(config.table).update(data).eq("id", id)
        : client.from(config.table).insert(data);
      const { data: rows, error } = await query.select("id");
      if (error) throw error;
      if (!rows?.length)
        throw new Error("No se guardó el registro. Comprueba los permisos.");
    }
    revalidatePath("/sistema", "layout");
    if (
      module === "agenda" &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
      after(async () => {
        try {
          await syncCalendar();
        } catch {
          /* durable queue + cron retry */
        }
      });
    return { success: "Guardado correctamente." };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : ((e as { message?: string })?.message ?? "No se pudo guardar");
    return {
      error: message.includes("no_overlapping")
        ? "Existe otra cita en ese horario."
        : message,
    };
  }
}
export async function closeNote(id: string) {
  const { client } = await staff(true);
  z.string().uuid().parse(id);
  const { data, error } = await client
    .from("medical_notes")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", id)
    .is("closed_at", null)
    .select("id");
  if (error || !data?.length) throw new Error("No se pudo cerrar la nota.");
  revalidatePath("/sistema", "layout");
}
export async function adjustStock(_: Result, form: FormData): Promise<Result> {
  const { client } = await staff(true);
  try {
    const id = z.string().uuid().parse(form.get("lot_id"));
    const delta = z.coerce
      .number()
      .int()
      .refine((v) => v !== 0)
      .parse(form.get("delta"));
    const reason = z.string().trim().min(3).max(500).parse(form.get("reason"));
    const { error } = await client.rpc("adjust_stock", {
      p_lot: id,
      p_delta: delta,
      p_reason: reason,
    });
    if (error) throw error;
    revalidatePath("/sistema", "layout");
    return { success: "Movimiento registrado." };
  } catch (e) {
    return { error: (e as { message: string }).message };
  }
}
export async function uploadFile(_: Result, form: FormData): Promise<Result> {
  const { client } = await staff(true);
  try {
    const patient = z.string().uuid().parse(form.get("patient_id"));
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 10485760)
      throw new Error("Adjunta un archivo de hasta 10 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    const isPng =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const mime = isPdf
      ? "application/pdf"
      : isPng
        ? "image/png"
        : isJpg
          ? "image/jpeg"
          : null;
    if (!mime) throw new Error("Solo PDF, JPEG o PNG válidos.");
    const path = `${patient}/${crypto.randomUUID()}.${isPdf ? "pdf" : isPng ? "png" : "jpg"}`;
    const { error: uploadError } = await client.storage
      .from("clinical")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;
    const purpose = z
      .enum(["documento", "fotografia", "laboratorio", "preoperatorio"])
      .parse(form.get("purpose"));
    const lab = String(form.get("laboratory_id") ?? "").trim();
    if (lab) z.string().uuid().parse(lab);
    if (lab) {
      const { data: found } = await client
        .from("laboratories")
        .select("id")
        .eq("id", lab)
        .eq("patient_id", patient)
        .single();
      if (!found) throw new Error("El laboratorio no pertenece al paciente");
    }
    const { error } = await client
      .from("clinical_files")
      .insert({
        patient_id: patient,
        laboratory_id: lab || null,
        purpose,
        name: file.name.slice(0, 200),
        object_path: path,
        mime,
      });
    if (error) throw error;
    revalidatePath("/sistema", "layout");
    return { success: "Archivo privado guardado." };
  } catch (e) {
    return { error: (e as { message: string }).message };
  }
}
export async function saveSettings(_: Result, form: FormData): Promise<Result> {
  const { client } = await staff(true);
  try {
    const clabe = String(form.get("clabe") ?? "").trim();
    if (clabe && !/^\d{18}$/.test(clabe))
      throw new Error("La CLABE debe tener 18 dígitos.");
    const threshold = z.coerce
      .number()
      .positive()
      .parse(form.get("psa_threshold"));
    const bank_public = form.get("bank_public") === "on";
    const rfc = String(form.get("rfc") ?? "").trim().toUpperCase();
    const rfc_public = form.get("rfc_public") === "on";
    if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc))
      throw new Error("Revisa el RFC: debe tener 12 o 13 caracteres válidos.");
    const payload = {
      biography: String(form.get("biography")),
      services: String(form.get("services")),
      beneficiary: String(form.get("beneficiary") ?? ""),
      bank: String(form.get("bank") ?? ""),
      clabe,
      bank_public,
      rfc,
      rfc_public,
      psa_threshold: threshold,
    };
    if (bank_public && (!clabe || !payload.bank || !payload.beneficiary))
      throw new Error("Completa banco, beneficiario y CLABE para publicar.");
    if (rfc_public && !rfc)
      throw new Error("Captura el RFC antes de autorizar su publicación.");
    const { error } = await client
      .from("site_settings")
      .update(payload)
      .eq("id", 1);
    if (error) throw error;
    for (const id of ["LP", "ZAM"]) {
      const maps = String(form.get(`${id}_maps_url`) ?? "").trim();
      if (maps) {
        const url = new URL(maps);
        if (
          url.protocol !== "https:" ||
          ![
            "maps.google.com",
            "www.google.com",
            "google.com",
            "maps.app.goo.gl",
            "goo.gl",
          ].includes(url.hostname)
        )
          throw new Error("Utiliza un enlace HTTPS de Google Maps.");
      }
      const { error: e } = await client
        .from("branches")
        .update({
          address: String(form.get(`${id}_address`) ?? ""),
          hours: String(form.get(`${id}_hours`) ?? ""),
          maps_url: maps,
        })
        .eq("id", id);
      if (e) throw e;
    }
    revalidatePath("/");
    revalidatePath("/sistema/configuracion");
    return { success: "Configuración guardada." };
  } catch (e) {
    return { error: (e as { message: string }).message };
  }
}
