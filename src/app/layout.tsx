import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nuki | Planner",
  description: "Planejamento e orçamento de personalização — Nuki Planner",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" translate="no">
      <body className={manrope.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
