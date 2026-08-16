import type { Metadata } from "next";
import ConvexClientProvider from "./convex-client-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMT Agency Admin",
  description: "MMT Agency payroll, attendance, billing, and profit management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full"><ConvexClientProvider>{children}</ConvexClientProvider></body>
    </html>
  );
}
