import type { Metadata } from "next";
import "./globals.css";
import "@daypicker/react/style.css";
import AuthProvider from "@/components/AuthProvider";
import GlobalThemeToggle from "@/components/GlobalThemeToggle";
import { ThemeProvider } from "@/components/ThemeProvider";
import { themeInitScript } from "@/components/themeScript";

export const metadata: Metadata = {
  title: "USB Lens",
  description: "Aplicación frontend del Proyecto USB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <GlobalThemeToggle />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}