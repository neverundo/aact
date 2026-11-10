import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AACT — Agnostically-Assigning-a-Comission Tool",
  description:
    "Plataforma self-hosted de atribuição e liquidação de comissões (AACommissionTool).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-900">
        {children}
      </body>
    </html>
  );
}
