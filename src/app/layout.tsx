import type { Metadata, Viewport } from "next";
import { Inter, Host_Grotesk, Martian_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Chatbot from "@/components/Chatbot";
import AxonTour from "@/components/chat/AxonTour";
import Cursor from "@/components/Cursor";
import { SITE, keywords, structuredData } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Brand display face (hero and headings) and a mono reserved for real numbers
const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-host-grotesk",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-martian-mono",
});

export const viewport: Viewport = {
  themeColor: "#000004",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  keywords,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    locale: "en_US",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    firstName: "Isuru",
    lastName: "Chathuranga",
    images: [{ url: SITE.image, width: 1200, height: 630, alt: "Isuru Chathuranga, AI/ML Engineer in Colombo, Sri Lanka" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    creator: "@Isuru_ig",
    images: [SITE.image],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${hostGrotesk.variable} ${martianMono.variable} font-sans antialiased`}>
        {/* Structured data: who this page is about, for search engines and AI assistants (src/lib/seo.ts) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c") }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Chatbot />
          <AxonTour />
          <Cursor />
        </ThemeProvider>
      </body>
    </html>
  );
}
