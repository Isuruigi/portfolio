"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Github,
    ArrowDown,
    Mail,
    Code,
    Briefcase,
    GraduationCap
} from "lucide-react";
import TechIcon from "@/components/ui/TechIcon";

const titles = [
    "AI/ML Engineer",
    "MLOps Specialist",
    "Multi-Agent Systems Developer",
    "Production ML Engineer",
];

const metrics = [
    { icon: Code, text: "Open Source Contributor" },
    { icon: Briefcase, text: "Freelance AI Engineer" },
    { icon: GraduationCap, text: "BSc IT & Management" },
];

const techStack = [
    { name: "pytorch", displayName: "PyTorch" },
    { name: "python", displayName: "Python" },
    { name: "langchain", displayName: "LangChain" },
    { name: "fastapi", displayName: "FastAPI" },
    { name: "docker", displayName: "Docker" },
    { name: "kubernetes", displayName: "Kubernetes" },
    { name: "amazonaws", displayName: "AWS" },
    { name: "googlecloud", displayName: "GCP" },
    { name: "postgresql", displayName: "PostgreSQL" },
];

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};

export default function Hero() {
    const [titleIndex, setTitleIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTitleIndex((prev) => (prev + 1) % titles.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section
            id="hero"
            className="min-h-screen flex items-center py-20 px-5"
        >
            <div className="max-w-[1200px] mx-auto w-full">
                <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-8">

                    {/* Left Side - Content */}
                    <motion.div
                        className="flex-1 lg:pr-8 text-center lg:text-left"
                        initial="initial"
                        animate="animate"
                        variants={{
                            animate: {
                                transition: { staggerChildren: 0.1 },
                            },
                        }}
                    >
                        {/* Availability Badge */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                🎉 Open to Remote Opportunities | Happy New Year 2026!
                            </span>
                        </motion.div>

                        {/* Name */}
                        <motion.h1
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-4xl md:text-5xl lg:text-[48px] font-bold text-foreground mb-4"
                        >
                            Isuru (IG) Chathuranga
                        </motion.h1>

                        {/* Animated Title */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="h-10 mb-6"
                        >
                            <AnimatePresence mode="wait">
                                <motion.h2
                                    key={titleIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[22px] md:text-[28px] font-semibold text-primary"
                                >
                                    {titles[titleIndex]}
                                </motion.h2>
                            </AnimatePresence>
                        </motion.div>

                        {/* Value Proposition */}
                        <motion.p
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg text-muted max-w-[600px] mb-8 mx-auto lg:mx-0 leading-relaxed"
                        >
                            <span className="text-foreground font-medium">I Ship AI Systems That Actually Work in Production.</span>{" "}
                            Building production-first ML systems with PyTorch, LangChain, and MLOps expertise.
                            Not just models—deployed systems that scale.
                        </motion.p>

                        {/* Key Metrics */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-wrap justify-center lg:justify-start gap-6 md:gap-8 mb-8"
                        >
                            {metrics.map((metric) => (
                                <div key={metric.text} className="flex items-center gap-2">
                                    <metric.icon className="w-5 h-5 text-primary" />
                                    <span className="text-sm text-muted">{metric.text}</span>
                                </div>
                            ))}
                        </motion.div>

                        {/* CTA Buttons */}
                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5, delay: 0.35 }}
                            className="flex flex-wrap justify-center lg:justify-start gap-3"
                        >
                            {/* Primary - GitHub Profile */}
                            <motion.a
                                href="https://github.com/Isuruigi"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-white rounded-lg font-medium transition-all duration-200"
                            >
                                <Github className="w-4 h-4" />
                                GitHub Profile
                            </motion.a>

                            {/* Secondary - View Projects */}
                            <motion.button
                                onClick={() => scrollToSection("projects")}
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 border border-border rounded-lg font-medium text-foreground hover:bg-secondary transition-all duration-200 cursor-pointer"
                            >
                                <ArrowDown className="w-4 h-4" />
                                View Projects
                            </motion.button>

                            {/* Tertiary - Contact */}
                            <motion.button
                                onClick={() => scrollToSection("contact")}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 h-11 px-6 font-medium text-muted hover:text-foreground transition-all duration-200 cursor-pointer"
                            >
                                <Mail className="w-4 h-4" />
                                Contact Me
                            </motion.button>
                        </motion.div>
                    </motion.div>

                    {/* Right Side - Profile Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex-shrink-0"
                    >
                        <div
                            className="w-[200px] h-[200px] lg:w-[300px] lg:h-[300px] rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-primary/30 overflow-hidden shadow-xl"
                        >
                            <img
                                src="/assets/profile.jpg"
                                alt="Isuru (IG) Chathuranga - AI/ML Engineer"
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                    </motion.div>

                </div>

                {/* Tech Stack Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-16 lg:mt-24"
                >
                    <p className="text-xs uppercase tracking-wider text-muted mb-6 text-center">
                        Core Tech Stack
                    </p>

                    <div className="flex gap-6 overflow-x-auto pb-4 justify-center scrollbar-hide">
                        {techStack.map((tech, index) => (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                                className="flex-shrink-0 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                            >
                                <TechIcon name={tech.name} size={32} />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
