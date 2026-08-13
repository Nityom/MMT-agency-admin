import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMT Agency Admin",
  description: "MMT Agency payroll, attendance, billing, and profit management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
