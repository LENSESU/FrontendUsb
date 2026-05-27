import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";


export const metadata: Metadata = {
  title: "Proyecto USB - Frontend",
  description: "Aplicación frontend del Proyecto USB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}