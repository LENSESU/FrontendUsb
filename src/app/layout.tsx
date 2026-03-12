import type { Metadata } from "next";
import "./globals.css";

import AuthWrapper from "../components/AuthWrapper";
import Header from "../components/Header";

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
        <AuthWrapper>
          <Header />
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
