import type { Metadata, Viewport } from "next";
import "./globals.css";
import { KipuOfflineRuntime } from "@/components/kipu-offline-runtime";

export const metadata: Metadata = {
  title: "Kipu",
  description: "Festhalten. Wiederfinden.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/Kipu-master-logo", type: "image/png", sizes: "1254x1254" }],
    shortcut: [{ url: "/Kipu-master-logo", type: "image/png" }],
    apple: [{ url: "/Kipu-master-logo", type: "image/png", sizes: "1254x1254" }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3eee5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body><KipuOfflineRuntime />{children}</body></html>;
}
