"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browser } from "@/lib/browser";
export function Realtime() {
  const router = useRouter();
  useEffect(() => {
    const client = browser();
    let timeout: ReturnType<typeof setTimeout>;
    const channel = client.channel("uromed-updates");
    for (const table of [
      "appointments",
      "followups",
      "applications",
      "inventory_lots",
    ])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => router.refresh(), 500);
        },
      );
    channel.subscribe();
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timeout);
      client.removeChannel(channel);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return null;
}
