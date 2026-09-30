import type { Metadata } from "next";
import { Libre_Baskerville, Courier_Prime } from "next/font/google";
import "./globals.css";

const baskerville = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const courierPrime = Courier_Prime({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Morphogenesis Mask",
  description: "CV → NFT 3D animado via multi-agent pipeline",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${baskerville.variable} ${courierPrime.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
