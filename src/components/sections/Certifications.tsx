"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Key, Clock, ExternalLink } from "lucide-react";
import CertificateImage from "@/components/ui/CertificateImage";

type Category = "Deep Learning" | "MLOps" | "LLMs & NLP" | "Machine Learning" | "Cloud & Data";

interface Certificate {
    id: number;
    provider: string;
    name: string;
    date: string;
    credentialId?: string;
    expires?: string;
    category: Category;
    skills: string[];
    verifyUrl?: string;
    image: string;
    badge?: string;
}

const certificates: Certificate[] = [
    // Official Certifications First (Most Prestigious)
    {
        id: 1,
        provider: "Oracle",
        name: "Oracle Cloud Infrastructure 2025 Certified AI Foundations Associate",
        date: "Nov 2025",
        expires: "Nov 2027",
        category: "Cloud & Data",
        skills: ["AI", "Generative AI", "Cloud Computing", "OCI"],
        image: "/certificates/cert-oracle-ai.png",
        badge: "🏆 Official Certification",
    },
    {
        id: 2,
        provider: "DataCamp",
        name: "AI Engineer for Data Scientists Associate",
        date: "Oct 2025",
        credentialId: "AEDS0017729553717",
        category: "Cloud & Data",
        skills: ["AI", "Deep Learning", "Python", "ML"],
        image: "/certificates/cert-ai-engineer-associate.png",
        badge: "🏆 Associate Level",
    },
    {
        id: 3,
        provider: "DataCamp",
        name: "Python Data Associate",
        date: "Nov 2025",
        credentialId: "PDA0011088973587",
        category: "Cloud & Data",
        skills: ["Pandas", "Python", "NumPy", "Data Analysis"],
        image: "/certificates/cert-python-data-associate.png",
        badge: "🏆 Associate Level",
    },
    // Deep Learning
    {
        id: 4,
        provider: "Coursera",
        name: "Deep Learning with PyTorch: Image Segmentation",
        date: "Dec 2025",
        credentialId: "U9HQMNMY8IFL",
        category: "Deep Learning",
        skills: ["PyTorch", "Deep Learning", "Computer Vision"],
        verifyUrl: "https://coursera.org/verify/U9HQMNMY8IFL",
        image: "/certificates/cert-pytorch-segmentation.jpeg",
    },
    {
        id: 5,
        provider: "Coursera",
        name: "Sentiment Analysis with Deep Learning using BERT",
        date: "Dec 2025",
        credentialId: "PKLA2SBZAB5E",
        category: "Deep Learning",
        skills: ["NLP", "Deep Learning", "Transformers", "BERT"],
        verifyUrl: "https://coursera.org/verify/PKLA2SBZAB5E",
        image: "/certificates/cert-bert-sentiment.jpeg",
    },
    {
        id: 6,
        provider: "DataCamp",
        name: "Introduction to Deep Learning with PyTorch",
        date: "Nov 2025",
        credentialId: "44499904",
        category: "Deep Learning",
        skills: ["Deep Learning", "Neural Networks", "PyTorch"],
        image: "/certificates/cert-datacamp-pytorch.jpg",
    },
    // LLMs & NLP
    {
        id: 7,
        provider: "LinkedIn Learning",
        name: "Model Context Protocol (MCP): Hands-On with Agentic AI",
        date: "Dec 2025",
        category: "LLMs & NLP",
        skills: ["AI Agents", "APIs", "Anthropic Claude", "MCP"],
        image: "/certificates/cert-mcp-agentic-ai.jpg",
    },
    {
        id: 8,
        provider: "DataCamp",
        name: "Working with Hugging Face",
        date: "Nov 2025",
        credentialId: "44776230",
        category: "LLMs & NLP",
        skills: ["LLMs", "Transformers", "NLP", "Hugging Face"],
        image: "/certificates/cert-huggingface.jpg",
    },
    {
        id: 9,
        provider: "Pearson",
        name: "Securing Generative AI",
        date: "Nov 2025",
        credentialId: "R2B70BNP8SYO",
        category: "LLMs & NLP",
        skills: ["Generative AI", "LLMs", "AI Security"],
        verifyUrl: "https://coursera.org/verify/R2B70BNP8SYO",
        image: "/certificates/cert-securing-genai.jpeg",
    },
    // MLOps
    {
        id: 10,
        provider: "LinkedIn Learning",
        name: "MLOps Essentials: Model Development and Integration",
        date: "Dec 2025",
        category: "MLOps",
        skills: ["AI", "Machine Learning", "MLOps"],
        image: "/certificates/cert-mlops-essentials.jpg",
    },
    {
        id: 11,
        provider: "LinkedIn Learning",
        name: "Learning Docker",
        date: "Dec 2025",
        category: "MLOps",
        skills: ["Docker", "Containerization"],
        image: "/certificates/cert-docker.jpg",
    },
    {
        id: 12,
        provider: "Astronomer",
        name: "Astronomer Certification DAG Authoring for Apache Airflow 3",
        date: "Nov 2025",
        credentialId: "db137be3-8988-415e-8047-146f34516dfe",
        category: "MLOps",
        skills: ["Apache Airflow", "Data Engineering", "MLOps", "ETL"],
        image: "/certificates/cert-airflow-dag.jpg",
    },
    {
        id: 13,
        provider: "Astronomer",
        name: "Astronomer Certification for Apache Airflow 3 Fundamentals",
        date: "Nov 2025",
        credentialId: "aiA3Xk7r",
        category: "MLOps",
        skills: ["Python", "Apache Airflow", "Data Pipelines"],
        image: "/certificates/cert-airflow-fundamentals.jpg",
    },
    // Machine Learning
    {
        id: 14,
        provider: "IBM",
        name: "Machine Learning with Python",
        date: "Nov 2025",
        credentialId: "BT75B11LBSBH",
        category: "Machine Learning",
        skills: ["Machine Learning", "Python", "scikit-learn"],
        verifyUrl: "https://coursera.org/verify/BT75B11LBSBH",
        image: "/certificates/cert-ibm-ml.jpeg",
    },
    {
        id: 15,
        provider: "Google",
        name: "The Nuts and Bolts of Machine Learning",
        date: "Nov 2025",
        credentialId: "X0TGCW156QRS",
        category: "Machine Learning",
        skills: ["Machine Learning", "Python", "Data Science"],
        verifyUrl: "https://coursera.org/verify/X0TGCW156QRS",
        image: "/certificates/cert-google-ml.jpeg",
    },
    {
        id: 16,
        provider: "DataCamp",
        name: "Supervised Learning with scikit-learn",
        date: "Nov 2025",
        credentialId: "44512576",
        category: "Machine Learning",
        skills: ["scikit-learn", "Supervised Learning", "Predictive Modeling"],
        image: "/certificates/cert-supervised-learning.jpg",
    },
    {
        id: 17,
        provider: "DataCamp",
        name: "Unsupervised Learning in Python",
        date: "Nov 2025",
        credentialId: "44775502",
        category: "Machine Learning",
        skills: ["Unsupervised Learning", "Clustering", "Dimensionality Reduction"],
        image: "/certificates/cert-unsupervised-learning.jpg",
    },
    {
        id: 18,
        provider: "Johns Hopkins University",
        name: "Regression Models",
        date: "Nov 2025",
        credentialId: "QV2RBRHKGC36",
        category: "Machine Learning",
        skills: ["Statistical Modeling", "Regression Analysis"],
        verifyUrl: "https://coursera.org/verify/QV2RBRHKGC36",
        image: "/certificates/cert-regression-models.jpeg",
    },
    {
        id: 19,
        provider: "LinkedIn Learning",
        name: "Understanding Bias in AI",
        date: "Dec 2025",
        category: "Machine Learning",
        skills: ["AI Ethics", "Responsible AI", "DEIB"],
        image: "/certificates/cert-bias-ai.jpg",
    },
    // Cloud & Data
    {
        id: 20,
        provider: "Coursera",
        name: "Portfolio Optimization using Markowitz Model",
        date: "Nov 2025",
        credentialId: "507KYZALF88C",
        category: "Cloud & Data",
        skills: ["Python", "Statistical Modeling", "Finance"],
        verifyUrl: "https://coursera.org/verify/507KYZALF88C",
        image: "/certificates/cert-portfolio-optimization.jpeg",
    },
];

const categories: (Category | "All")[] = ["All", "Deep Learning", "MLOps", "LLMs & NLP", "Machine Learning", "Cloud & Data"];

const stats = [
    { value: "20+", label: "Certifications" },
    { value: "8", label: "Providers" },
    { value: "5", label: "Categories" },
    { value: "Recent", label: "Nov-Dec 2025" },
];

function getCategoryColor(category: Category): string {
    const colors: Record<Category, string> = {
        "Deep Learning": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
        "MLOps": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
        "LLMs & NLP": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
        "Machine Learning": "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
        "Cloud & Data": "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200",
    };
    return colors[category];
}

function truncateId(id: string): string {
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
}

export default function Certifications() {
    const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

    const filteredCerts = activeCategory === "All"
        ? certificates
        : certificates.filter((c) => c.category === activeCategory);

    return (
        <section id="certifications" className="py-24 px-5 bg-card">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Certifications
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Validated AI/ML Expertise
                    </h2>
                    <p className="text-lg text-muted max-w-[600px] mx-auto">
                        20+ industry-recognized certifications in AI, ML, and production systems
                    </p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-wrap justify-center gap-6 sm:gap-12 mb-10 p-6 rounded-xl bg-background border border-border max-w-[700px] mx-auto"
                >
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="flex flex-wrap justify-center gap-2 mb-10"
                >
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                ${activeCategory === category
                                    ? "bg-primary text-white"
                                    : "bg-background border border-border text-muted hover:text-foreground hover:border-primary/50"
                                }
              `}
                        >
                            {category}
                        </button>
                    ))}
                </motion.div>

                {/* Results Count */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center text-sm text-muted mb-8"
                >
                    Showing {filteredCerts.length} of {certificates.length} certifications
                </motion.p>

                {/* Certificates Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredCerts.map((cert, index) => (
                            <motion.div
                                key={cert.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{ y: -4 }}
                                className="p-5 rounded-xl border border-border bg-background hover:shadow-lg transition-all duration-200"
                            >
                                {/* Certificate Image */}
                                <CertificateImage
                                    src={cert.image}
                                    alt={`${cert.name} - ${cert.provider}`}
                                    credentialId={cert.credentialId}
                                    verifyUrl={cert.verifyUrl}
                                    className="mb-4"
                                />

                                {/* Badge (if special certification) */}
                                {cert.badge && (
                                    <div className="mb-2">
                                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                            {cert.badge}
                                        </span>
                                    </div>
                                )}

                                {/* Certificate Name */}
                                <h3 className="font-semibold text-base text-foreground mb-1 line-clamp-2">
                                    {cert.name}
                                </h3>

                                {/* Provider */}
                                <p className="text-sm text-muted mb-3">
                                    {cert.provider}
                                </p>

                                {/* Category Badge */}
                                <div className="mb-3">
                                    <span className={`text-xs px-2 py-1 rounded-md ${getCategoryColor(cert.category)}`}>
                                        {cert.category}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-1 text-sm mb-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted" />
                                        <span className="text-muted">Issued: {cert.date}</span>
                                    </div>

                                    {cert.credentialId && (
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-muted" />
                                            <span className="text-muted font-mono text-xs">
                                                ID: {truncateId(cert.credentialId)}
                                            </span>
                                        </div>
                                    )}

                                    {cert.expires && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            <span className="text-orange-500 text-xs">
                                                Expires: {cert.expires}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Skills */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {cert.skills.slice(0, 3).map((skill) => (
                                        <span
                                            key={skill}
                                            className="text-xs px-2 py-1 bg-secondary rounded text-muted"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {cert.skills.length > 3 && (
                                        <span className="text-xs px-2 py-1 bg-secondary rounded text-muted">
                                            +{cert.skills.length - 3}
                                        </span>
                                    )}
                                </div>

                                {/* Verify Button */}
                                {cert.verifyUrl && (
                                    <a
                                        href={cert.verifyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Verify Certificate
                                    </a>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    );
}
