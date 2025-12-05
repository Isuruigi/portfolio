"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
    { href: "#about", label: "About" },
    { href: "#tech-stack", label: "Tech Stack" },
    { href: "#projects", label: "Projects" },
    { href: "#experience", label: "Experience" },
    { href: "#blog", label: "Blog" },
    { href: "#certifications", label: "Certifications" },
    { href: "#contact", label: "Contact" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("");

    // Track active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const sections = navLinks.map(link => link.href.slice(1));
            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIsOpen(false);
    };

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const targetId = href.slice(1);
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
        setIsOpen(false);
    };

    return (
        <>
            <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-xl"
            >
                <nav className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between">
                    {/* Logo / Name */}
                    <motion.button
                        onClick={scrollToTop}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors duration-200 cursor-pointer"
                    >
                        Isuru (IG) Chathuranga
                    </motion.button>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <ul className="flex items-center gap-6">
                            {navLinks.map((link, index) => (
                                <motion.li
                                    key={link.href}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <a
                                        href={link.href}
                                        onClick={(e) => handleLinkClick(e, link.href)}
                                        className={`
                      relative text-sm font-medium transition-colors duration-200
                      ${activeSection === link.href.slice(1)
                                                ? "text-primary"
                                                : "text-muted hover:text-primary"
                                            }
                    `}
                                    >
                                        {link.label}
                                        {activeSection === link.href.slice(1) && (
                                            <motion.div
                                                layoutId="activeSection"
                                                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                    </a>
                                </motion.li>
                            ))}
                        </ul>
                        <ThemeToggle />
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-4 md:hidden">
                        <ThemeToggle />
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsOpen(true)}
                            className="w-10 h-10 rounded-full border border-border bg-transparent flex items-center justify-center hover:bg-secondary transition-all duration-200 cursor-pointer"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5 text-foreground" />
                        </motion.button>
                    </div>
                </nav>
            </motion.header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
                        />

                        {/* Slide-in Menu */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border md:hidden"
                        >
                            <div className="flex flex-col h-full p-6">
                                {/* Close Button */}
                                <div className="flex justify-end mb-8">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsOpen(false)}
                                        className="w-10 h-10 rounded-full border border-border bg-transparent flex items-center justify-center hover:bg-secondary transition-all duration-200 cursor-pointer"
                                        aria-label="Close menu"
                                    >
                                        <X className="w-5 h-5 text-foreground" />
                                    </motion.button>
                                </div>

                                {/* Navigation Links */}
                                <nav className="flex-1">
                                    <ul className="space-y-2">
                                        {navLinks.map((link, index) => (
                                            <motion.li
                                                key={link.href}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.05 * index }}
                                            >
                                                <a
                                                    href={link.href}
                                                    onClick={(e) => handleLinkClick(e, link.href)}
                                                    className={`
                            block py-3 px-4 text-lg font-medium rounded-lg transition-all duration-200
                            ${activeSection === link.href.slice(1)
                                                            ? "text-primary bg-primary/10"
                                                            : "text-muted hover:text-foreground hover:bg-secondary"
                                                        }
                          `}
                                                >
                                                    {link.label}
                                                </a>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </nav>

                                {/* Footer */}
                                <div className="pt-6 border-t border-border">
                                    <p className="text-sm text-muted text-center">
                                        © {new Date().getFullYear()} Isuru (IG)
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
