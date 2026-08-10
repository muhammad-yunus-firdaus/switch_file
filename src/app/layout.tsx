import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";
import "./globals.css";

// ============================================================================
// Font Configuration (per design.md: Inter / Plus Jakarta Sans)
// ============================================================================

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

// ============================================================================
// SEO Metadata
// ============================================================================

export const metadata: Metadata = {
  title: "SwitchFile — Free Client-Side File Converter",
  description:
    "Convert and compress PDF, DOCX, XLSX, PNG, JPG, WebP, and HEIC files instantly in your browser. 100% private, no uploads, no server processing.",
  keywords: [
    "file converter",
    "image compressor",
    "PDF to PNG",
    "JPG to WebP",
    "client-side conversion",
    "free file converter",
    "browser file converter",
  ],
  authors: [{ name: "SwitchFile" }],
  openGraph: {
    title: "SwitchFile — Free Client-Side File Converter",
    description:
      "Convert and compress files instantly in your browser. 100% private.",
    type: "website",
  },
};

// ============================================================================
// Root Layout
// ============================================================================

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} h-full antialiased overflow-x-hidden`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SwitchFile" />
      </head>
      <body className="min-h-full bg-[#F3F4F6] font-sans text-[#1E293B] overflow-x-hidden">
        <TooltipProvider delay={300}>
          {children}
          <InstallPwaBanner />
        </TooltipProvider>
      </body>
    </html>
  );
}
