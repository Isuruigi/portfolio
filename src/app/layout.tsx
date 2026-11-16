import type { Metadata, Viewport } from "next";
import { Inter, Host_Grotesk, Martian_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Chatbot from "@/components/Chatbot";
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
  title: "Isuru Chathuranga | AI/ML Engineer @ Veracity Digital",
  description: "AI/ML Engineer at Veracity Digital and Technical Assistant on BuildrLabs.ai's AI Bootcamps, shipping systems that hold up in production, not just notebooks. Agentic AI, RAG and GraphRAG, multi-agent systems, and MLOps with PyTorch, LangGraph, and vLLM. Based in Colombo, Sri Lanka - Remote Ready.",
  metadataBase: new URL("https://isuruig.com"),
  keywords: [
    "AI Engineer",
    "Agentic AI",
    "LangGraph",
    "RAG",
    "GraphRAG",
    "vLLM",
    "ML Engineer",
    "MLOps",
    "AIOps",
    "PyTorch",
    "LangChain",
    "Multi-Agent Systems",
    "LLM Engineering",
    "Production ML",
    "Remote Developer",
    "Sri Lanka",
    "Open Source Contributor",
  ],
  authors: [{ name: "Isuru Chathuranga" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://isuruig.com",
    title: "Isuru Chathuranga | AI/ML Engineer",
    description: "Shipping AI systems that hold up in production, not just notebooks",
    siteName: "Isuru Chathuranga Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Isuru Chathuranga | AI/ML Engineer",
    description: "AI systems that hold up in production, not just notebooks",
  },
  robots: {
    index: true,
    follow: true,
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
