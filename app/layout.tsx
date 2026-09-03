import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kipu",
  description: "save now. find later.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/Kipu-master-logo", type: "image/png" }],
    apple: [{ url: "/Kipu-master-logo", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3eee5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
