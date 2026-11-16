"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Check, Copy, AlertCircle } from "lucide-react";
import { socials } from "@/lib/socials";

const contactInfo = [
    { label: "Email", value: "isuruigic@gmail.com", copyable: true },
    { label: "Phone", value: "+94 77 050 0424", copyable: true },
    { label: "Based in", value: "Colombo, Sri Lanka. Works remotely across time zones." },
    { label: "Replies", value: "Usually within 24 hours" },
];

const elsewhere = socials;

// Shared input styling; the border turns warm on error
const fieldClass = (invalid?: boolean) =>
    `w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-ink placeholder:text-ash/60 transition-colors focus:outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30 ${
        invalid ? "border-inferno-3" : "border-white/10"
    }`;


const subjectOptions = [
    "Full-time Remote Role",
    "Freelance Project",
    "Collaboration Opportunity",
    "Open Source Discussion",
    "Teaching or Mentoring",
    "General Inquiry",
];

// The three doors at the top of the section; each preselects a subject
const doors = [
    { id: "hire", title: "Hire me", line: "A full-time role, remote or in Colombo.", subject: "Full-time Remote Role" },
    { id: "build", title: "Build with me", line: "A freelance project or a system that has to ship.", subject: "Freelance Project" },
    { id: "learn", title: "Learn with me", line: "Workshops, mentoring or a bootcamp session.", subject: "Teaching or Mentoring" },
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

    const chooseDoor = (subject: string) => {
        setFormData((prev) => ({ ...prev, subject }));
        document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // The voice agent can open a door for the caller ("I want to hire him")
    useEffect(() => {
        const onDoor = (e: Event) => {
            const door = doors.find((d) => d.id === (e as CustomEvent<string>).detail);
            if (door) setFormData((prev) => ({ ...prev, subject: door.subject }));
        };
        window.addEventListener("contact-door", onDoor);
        return () => window.removeEventListener("contact-door", onDoor);
    }, []);

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
        <section id="contact" className="scroll-mt-16 bg-void py-28 text-ink">
            <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-14"
                >
                    <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1] tracking-[-0.04em] text-ink">
                        Pick a door
                    </h2>
                    <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-ash">
                        Three ways to work together. Choose one and the form below is ready for you.
                    </p>
                    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {doors.map((d) => {
                            const chosen = formData.subject === d.subject;
                            return (
                                <button
                                    key={d.title}
                                    type="button"
                                    onClick={() => chooseDoor(d.subject)}
                                    aria-pressed={chosen}
                                    className={`cursor-pointer rounded-2xl border p-6 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                                        chosen ? "border-ember bg-ember/10" : "border-white/10 hover:border-ember/50 hover:bg-white/[0.03]"
                                    }`}
                                >
                                    <span className="block font-display text-2xl font-light tracking-[-0.02em] text-ink">{d.title}</span>
                                    <span className="mt-2 block text-sm leading-relaxed text-ash">{d.line}</span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column - Contact Information */}
                    <div>
                        <h3 className="font-display text-2xl font-light tracking-[-0.02em]">Or reach out directly</h3>
                        <dl className="mt-6 border-t border-white/10">
                            {contactInfo.map((info) => (
                                <div key={info.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-white/10 py-4">
                                    <dt className="text-sm text-ash">{info.label}</dt>
                                    <dd className="flex min-w-0 items-center gap-2 text-[15px]">
                                        <span className="break-words">{info.value}</span>
                                        {info.copyable && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(info.value, info.label)}
                                                aria-label={`Copy ${info.label.toLowerCase()}`}
                                                className="shrink-0 cursor-pointer rounded p-1 text-ash transition-colors hover:bg-white/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-ember"
                                            >
                                                {copiedField === info.label ? (
                                                    <Check className="h-4 w-4 text-ember" aria-hidden="true" />
                                                ) : (
                                                    <Copy className="h-4 w-4" aria-hidden="true" />
                                                )}
                                            </button>
                                        )}
                                        {copiedField === info.label && (
                                            <span className="text-xs text-ember" role="status">
                                                Copied
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                            {elsewhere.map((l) => (
                                <li key={l.label}>
                                    <a
                                        href={l.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium underline decoration-inferno-3 underline-offset-[6px] transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                                    >
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right Column - Contact Form */}
                    <div>
                        <form id="contact-form" onSubmit={handleSubmit} className="scroll-mt-24 space-y-5">
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
                                <label htmlFor="name" className="mb-2 block text-sm text-ash">
                                    Name <span className="text-ember" aria-hidden="true">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    placeholder="Jane Perera"
                                    name="name"
                                    autoComplete="name"
                                    className={fieldClass(!!(touched.name && errors.name))}
                                />
                                {touched.name && errors.name && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-inferno-3">
                                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="mb-2 block text-sm text-ash">
                                    Email <span className="text-ember" aria-hidden="true">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    onBlur={() => handleBlur("email")}
                                    placeholder="jane@company.com"
                                    name="email"
                                    autoComplete="email"
                                    spellCheck={false}
                                    className={fieldClass(!!(touched.email && errors.email))}
                                />
                                {touched.email && errors.email && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-inferno-3">
                                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Company */}
                            <div>
                                <label htmlFor="company" className="mb-2 block text-sm text-ash">
                                    Company
                                </label>
                                <input
                                    type="text"
                                    id="company"
                                    value={formData.company}
                                    onChange={(e) => handleChange("company", e.target.value)}
                                    placeholder="Optional"
                                    name="company"
                                    autoComplete="organization"
                                    className={fieldClass()}
                                />
                            </div>

                            {/* Subject */}
                            <div>
                                <label htmlFor="subject" className="mb-2 block text-sm text-ash">
                                    Subject <span className="text-ember" aria-hidden="true">*</span>
                                </label>
                                <select
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => handleChange("subject", e.target.value)}
                                    onBlur={() => handleBlur("subject")}
                                    name="subject"
                                    className={`${fieldClass(!!(touched.subject && errors.subject))} cursor-pointer bg-[#0b0a12] text-ink`}
                                >
                                    <option value="">Choose a subject…</option>
                                    {subjectOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                {touched.subject && errors.subject && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-inferno-3">
                                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                        {errors.subject}
                                    </p>
                                )}
                            </div>

                            {/* Message */}
                            <div>
                                <label htmlFor="message" className="mb-2 block text-sm text-ash">
                                    Message <span className="text-ember" aria-hidden="true">*</span>
                                </label>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => handleChange("message", e.target.value)}
                                    onBlur={() => handleBlur("message")}
                                    placeholder="What are you working on, and how can I help?"
                                    rows={6}
                                    name="message"
                                    className={`${fieldClass(!!(touched.message && errors.message))} resize-none`}
                                />
                                <div className="flex justify-between items-center mt-1">
                                    {touched.message && errors.message ? (
                                        <p className="flex items-center gap-1.5 text-sm text-inferno-3">
                                            <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                            {errors.message}
                                        </p>
                                    ) : (
                                        <span className="font-mono text-[11px] tabular-nums text-ash">
                                            {formData.message.length} / 50 minimum
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={status === "loading" || status === "success"}
                                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ember font-medium text-void transition-colors hover:bg-inferno-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {status === "loading" && (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" aria-hidden="true" />
                                        Sending…
                                    </>
                                )}
                                {status === "success" && (
                                    <>
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                        Sent
                                    </>
                                )}
                                {status === "error" && "Try again"}
                                {status === "idle" && (
                                    <>
                                        <Send className="h-4 w-4" aria-hidden="true" />
                                        Send message
                                    </>
                                )}
                            </button>

                            {/* Success Message */}
                            {status === "success" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    role="status"
                                    className="rounded-xl border border-ember/30 bg-ember/10 p-4 text-ink"
                                >
                                    <p className="font-medium">Message sent.</p>
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
                                    role="alert"
                                    className="rounded-xl border border-inferno-3/40 bg-inferno-3/10 p-4 text-ink"
                                >
                                    <p className="font-medium">Something went wrong.</p>
                                    <p className="text-sm mt-1">
                                        Please try again or email me directly at isuruigic@gmail.com
                                    </p>
                                </motion.div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
