"use client";
import { useState } from "react";
export function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "CLABE copiada" : "Copiar CLABE"}
    </button>
  );
}
