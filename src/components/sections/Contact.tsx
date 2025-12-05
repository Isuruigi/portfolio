"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    Check,
    Linkedin,
    Github,
    Copy,
    AlertCircle,
    Link as LinkIcon
} from "lucide-react";

// Custom X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const contactInfo = [
    {
        icon: Mail,
        label: "Email",
        value: "isuruigic@gmail.com",
        copyable: true,
    },
    {
        icon: Phone,
        label: "Phone",
        value: "+94 77 050 0424",
        copyable: true,
    },
    {
        icon: MapPin,
        label: "Location",
        value: "Colombo, Sri Lanka",
        subtext: "Remote Ready • Available Globally",
    },
    {
        icon: Clock,
        label: "Response Time",
        value: "Within 24 hours",
        subtext: "Usually faster for interesting projects",
    },
];

const socialLinks = [
    { icon: Linkedin, href: "https://www.linkedin.com/in/isuruig", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/Isuruigi", label: "GitHub" },
    { icon: XIcon, href: "https://x.com/Isuru_ig", label: "X" },
    { icon: Mail, href: "mailto:isuruigic@gmail.com", label: "Email" },
    { icon: LinkIcon, href: "https://linktr.ee/isuruig", label: "Linktree" },
];


const subjectOptions = [
    "Full-time Remote Role",
    "Freelance Project",
    "Collaboration Opportunity",
    "Open Source Discussion",
    "General Inquiry",
];

const seeking = [
    "Remote AI/ML Engineering roles",
    "LLM engineering & multi-agent systems",
    "MLOps/AIOps infrastructure positions",
    "Production ML pipeline development",
    "Open source collaborations",
];

interface FormData {
    name: string;
    email: string;
    company: string;
    subject: string;
    message: string;
    honeypot: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

export default function Contact() {
    const [formData, setFormData] = useState<FormData>({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        honeypot: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Please enter your name";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Please enter your email";
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Please enter a valid email";
        }

        if (!formData.subject) {
            newErrors.subject = "Please select a subject";
        }

        if (!formData.message.trim()) {
            newErrors.message = "Please enter a message";
        } else if (formData.message.trim().length < 50) {
            newErrors.message = `Message must be at least 50 characters (${formData.message.trim().length}/50)`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (field: string) => {
        setTouched({ ...touched, [field]: true });
        validateForm();
    };

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData({ ...formData, [field]: value });
        if (touched[field]) {
            validateForm();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Honeypot check
        if (formData.honeypot) {
            return;
        }

        if (!validateForm()) {
            return;
        }

        setStatus("loading");

        try {
            // Web3Forms API - Replace with your access key
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    access_key: "c11427d8-8b12-4416-b2cd-b2eccfda4714",
                    name: formData.name,
                    email: formData.email,
                    company: formData.company || "Not provided",
                    subject: `Portfolio Contact: ${formData.subject}`,
                    message: formData.message,
                    from_name: "Portfolio Contact Form",
                }),
            });

            const result = await response.json();

            if (result.success) {
                setStatus("success");

                // Reset form after 3 seconds
                setTimeout(() => {
                    setFormData({
                        name: "",
                        email: "",
                        company: "",
                        subject: "",
                        message: "",
                        honeypot: "",
                    });
                    setTouched({});
                    setStatus("idle");
                }, 3000);
            } else {
                throw new Error(result.message || "Failed to send message");
            }
        } catch {
            setStatus("error");
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <section id="contact" className="py-24 px-5">
            <div className="max-w-[1000px] mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Get In Touch
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Let&apos;s Build Production AI Together
                    </h2>
                    <p className="text-lg text-muted max-w-[600px] mx-auto">
                        Open to remote AI/ML roles, freelance projects, and collaborations on production systems
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column - Contact Information */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {/* Currently Seeking */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                Currently seeking:
                            </h3>
                            <ul className="space-y-2">
                                {seeking.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-muted">
                                        <span className="text-primary mt-1">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-4 mb-8">
                            {contactInfo.map((info) => (
                                <div
                                    key={info.label}
                                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <info.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted uppercase tracking-wider mb-1">
                                            {info.label}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-foreground font-medium">{info.value}</p>
                                            {info.copyable && (
                                                <button
                                                    onClick={() => copyToClipboard(info.value, info.label)}
                                                    className="p-1 hover:bg-secondary rounded transition-colors cursor-pointer"
                                                    title="Copy"
                                                >
                                                    {copiedField === info.label ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-muted" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        {info.subtext && (
                                            <p className="text-sm text-muted">{info.subtext}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Social Links */}
                        <div>
                            <h3 className="text-sm font-medium text-muted mb-4">
                                Connect with me
                            </h3>
                            <div className="flex gap-4">
                                {socialLinks.map((link) => (
                                    <motion.a
                                        key={link.label}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all duration-200"
                                        title={link.label}
                                    >
                                        <link.icon className="w-5 h-5" />
                                    </motion.a>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column - Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Honeypot */}
                            <input
                                type="text"
                                name="honeypot"
                                value={formData.honeypot}
                                onChange={(e) => handleChange("honeypot", e.target.value)}
                                className="hidden"
                                tabIndex={-1}
                                autoComplete="off"
                            />

                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                    Name <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    placeholder="Your name"
                                    className={`
                    w-full px-4 py-3 rounded-lg border bg-card text-foreground
                    focus:outline-none focus:border-primary transition-colors
                    ${touched.name && errors.name ? "border-red-500" : "border-border"}
                  `}
                                />
                                {touched.name && errors.name && (
                                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                    Email <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    onBlur={() => handleBlur("email")}
                                    placeholder="your.email@company.com"
                                    className={`
                    w-full px-4 py-3 rounded-lg border bg-card text-foreground
                    focus:outline-none focus:border-primary transition-colors
                    ${touched.email && errors.email ? "border-red-500" : "border-border"}
                  `}
                                />
                                {touched.email && errors.email && (
                                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Company */}
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                                    Company
                                </label>
                                <input
                                    type="text"
                                    id="company"
                                    value={formData.company}
                                    onChange={(e) => handleChange("company", e.target.value)}
                                    placeholder="Your company (optional)"
                                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Subject */}
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                                    Subject <span className="text-primary">*</span>
                                </label>
                                <select
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => handleChange("subject", e.target.value)}
                                    onBlur={() => handleBlur("subject")}
                                    className={`
                    w-full px-4 py-3 rounded-lg border bg-card text-foreground
                    focus:outline-none focus:border-primary transition-colors cursor-pointer
                    ${touched.subject && errors.subject ? "border-red-500" : "border-border"}
                  `}
                                >
                                    <option value="">Select a subject...</option>
                                    {subjectOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                {touched.subject && errors.subject && (
                                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.subject}
                                    </p>
                                )}
                            </div>

                            {/* Message */}
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                                    Message <span className="text-primary">*</span>
                                </label>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => handleChange("message", e.target.value)}
                                    onBlur={() => handleBlur("message")}
                                    placeholder="Tell me about the opportunity, project, or what you'd like to discuss..."
                                    rows={6}
                                    className={`
                    w-full px-4 py-3 rounded-lg border bg-card text-foreground resize-none
                    focus:outline-none focus:border-primary transition-colors
                    ${touched.message && errors.message ? "border-red-500" : "border-border"}
                  `}
                                />
                                <div className="flex justify-between items-center mt-1">
                                    {touched.message && errors.message ? (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.message}
                                        </p>
                                    ) : (
                                        <span className="text-xs text-muted">
                                            {formData.message.length} / 50 minimum
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={status === "loading" || status === "success"}
                                whileHover={{ scale: status === "idle" ? 1.01 : 1 }}
                                whileTap={{ scale: status === "idle" ? 0.99 : 1 }}
                                className={`
                  w-full h-12 rounded-lg font-medium flex items-center justify-center gap-2
                  transition-all duration-200 cursor-pointer
                  ${status === "success"
                                        ? "bg-green-500 text-white"
                                        : status === "error"
                                            ? "bg-red-500 text-white"
                                            : "bg-primary text-white hover:opacity-90"
                                    }
                  disabled:opacity-70 disabled:cursor-not-allowed
                `}
                            >
                                {status === "loading" && (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </>
                                )}
                                {status === "success" && (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Sent!
                                    </>
                                )}
                                {status === "error" && "Try Again"}
                                {status === "idle" && (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send Message
                                    </>
                                )}
                            </motion.button>

                            {/* Success Message */}
                            {status === "success" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
                                >
                                    <p className="font-medium">Message sent successfully!</p>
                                    <p className="text-sm mt-1">
                                        I&apos;ll respond within 24 hours. For urgent matters, reach me on LinkedIn.
                                    </p>
                                </motion.div>
                            )}

                            {/* Error Message */}
                            {status === "error" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                                >
                                    <p className="font-medium">Something went wrong.</p>
                                    <p className="text-sm mt-1">
                                        Please try again or email me directly at isuruigic@gmail.com
                                    </p>
                                </motion.div>
                            )}
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
