import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "UROMED | Dr. Israel Jiménez Heredia",
  description: "La Urología a tu Alcance. La Piedad y Zamora.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
