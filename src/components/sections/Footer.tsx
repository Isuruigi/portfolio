"use client";

import { motion } from "framer-motion";
import { Linkedin, Github, Mail, Link as LinkIcon } from "lucide-react";

// Custom X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const quickLinks = [
    { name: "About", href: "#about" },
    { name: "Tech Stack", href: "#tech-stack" },
    { name: "Projects", href: "#projects" },
    { name: "Experience", href: "#experience" },
    { name: "Blog", href: "#blog" },
    { name: "Certifications", href: "#certifications" },
    { name: "Contact", href: "#contact" },
];

const socialLinks = [
    { icon: Linkedin, href: "https://www.linkedin.com/in/isuruig", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/Isuruigi", label: "GitHub" },
    { icon: XIcon, href: "https://x.com/Isuru_ig", label: "X" },
    { icon: Mail, href: "mailto:isuruigic@gmail.com", label: "Email" },
    { icon: LinkIcon, href: "https://linktr.ee/isuruig", label: "Linktree" },
];

export default function Footer() {
    const scrollToSection = (href: string) => {
        if (href.startsWith("#")) {
            const element = document.getElementById(href.slice(1));
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        }
    };

    return (
        <footer className="border-t border-border bg-card">
            <div className="max-w-[1200px] mx-auto px-5 py-16">
                {/* Top Section - 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Column 1 - Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h3 className="text-xl font-bold text-foreground mb-2">
                            Isuru (IG) Chathuranga
                        </h3>
                        <p className="text-primary font-medium mb-1">
                            Shipping Production AI Systems
                        </p>
                        <p className="text-sm text-muted">
                            AI/ML Engineer | MLOps Specialist
                        </p>
                    </motion.div>


                    {/* Column 2 - Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <h4 className="text-sm uppercase tracking-wider text-muted mb-4">
                            Navigate
                        </h4>
                        <nav className="grid grid-cols-2 gap-2">
                            {quickLinks.map((link) => (
                                <button
                                    key={link.name}
                                    onClick={() => scrollToSection(link.href)}
                                    className="text-left text-muted hover:text-foreground transition-colors cursor-pointer"
                                >
                                    {link.name}
                                </button>
                            ))}
                        </nav>
                    </motion.div>

                    {/* Column 3 - Connect */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h4 className="text-sm uppercase tracking-wider text-muted mb-4">
                            Connect
                        </h4>
                        <div className="space-y-2">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    target={link.href.startsWith("mailto") ? undefined : "_blank"}
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
                                >
                                    <link.icon className="w-4 h-4" />
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Divider */}
                <div className="border-t border-border my-8" />

                {/* Bottom Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-center space-y-4"
                >
                    {/* Social Icons */}
                    <div className="flex justify-center gap-4">
                        {socialLinks.slice(0, 3).map((link) => (
                            <motion.a
                                key={link.label}
                                href={link.href}
                                target={link.href.startsWith("mailto") ? undefined : "_blank"}
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all duration-200"
                                aria-label={link.label}
                            >
                                <link.icon className="w-4 h-4" />
                            </motion.a>
                        ))}
                    </div>

                    {/* Copyright */}
                    <p className="text-sm text-muted">
                        © {new Date().getFullYear()} Isuru (IG) Chathuranga. All rights reserved.
                    </p>

                    {/* Tech Stack */}
                    <p className="text-xs text-muted/70">
                        Built with Next.js • TypeScript • Tailwind CSS • Framer Motion
                    </p>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Open to Remote Opportunities
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
