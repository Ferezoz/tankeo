import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gasolineras MX",
  description: "Encuentra las gasolineras más cercanas y baratas en México",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
