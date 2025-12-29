import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Chatbot from "@/components/Chatbot";
import Confetti from "@/components/Confetti";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Isuru Chathuranga | AI/ML Engineer & MLOps Specialist",
  description: "AI/ML Engineer shipping production systems with PyTorch, LangChain, and MLOps expertise. Open source contributor to LangChain, PyTorch, and Hugging Face. Specializing in multi-agent systems, LLM engineering, and production ML pipelines. Based in Colombo, Sri Lanka - Remote Ready.",
  keywords: [
    "AI Engineer",
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
    description: "Shipping production AI systems with PyTorch, LangChain, and MLOps",
    siteName: "Isuru Chathuranga Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Isuru Chathuranga | AI/ML Engineer",
    description: "Production AI systems with PyTorch & LangChain",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Confetti />
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
