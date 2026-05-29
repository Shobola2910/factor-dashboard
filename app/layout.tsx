import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factor ELD Dashboard",
  description: "Professional ELD monitoring & compliance dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
