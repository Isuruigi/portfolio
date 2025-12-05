"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Info } from "lucide-react";
import TechIcon from "@/components/ui/TechIcon";

type SkillLevel = "Proficient" | "Intermediate" | "Familiar";
type Category = "Deep Learning" | "LLMs & Agents" | "MLOps" | "Cloud ML" | "Data Science";

interface Technology {
    name: string;
    displayName: string;
    level: SkillLevel;
    stars: 2 | 3 | 4;
    category: Category;
    description: string;
}

const technologies: Technology[] = [
    // Deep Learning Frameworks
    { name: "pytorch", displayName: "PyTorch", level: "Proficient", stars: 4, category: "Deep Learning", description: "Primary DL Framework" },
    { name: "tensorflow", displayName: "TensorFlow", level: "Intermediate", stars: 3, category: "Deep Learning", description: "Neural Networks" },
    { name: "keras", displayName: "Keras", level: "Intermediate", stars: 3, category: "Deep Learning", description: "High-Level API" },
    { name: "pytorch", displayName: "PEFT (LoRA)", level: "Intermediate", stars: 3, category: "Deep Learning", description: "Model Fine-Tuning" },

    // LLMs & Multi-Agent Systems
    { name: "langchain", displayName: "LangChain", level: "Proficient", stars: 4, category: "LLMs & Agents", description: "Multi-Agent Orchestration" },
    { name: "huggingface", displayName: "Transformers", level: "Intermediate", stars: 3, category: "LLMs & Agents", description: "Pre-trained Models" },
    { name: "openai", displayName: "OpenAI API", level: "Intermediate", stars: 3, category: "LLMs & Agents", description: "GPT Integration" },
    { name: "anthropic", displayName: "Anthropic Claude", level: "Intermediate", stars: 3, category: "LLMs & Agents", description: "Claude API" },
    { name: "pinecone", displayName: "Pinecone", level: "Familiar", stars: 2, category: "LLMs & Agents", description: "Vector Database" },

    // MLOps & Production
    { name: "fastapi", displayName: "FastAPI", level: "Proficient", stars: 4, category: "MLOps", description: "ML API Development" },
    { name: "docker", displayName: "Docker", level: "Proficient", stars: 4, category: "MLOps", description: "ML Containerization" },
    { name: "kubernetes", displayName: "Kubernetes", level: "Intermediate", stars: 3, category: "MLOps", description: "Model Orchestration" },
    { name: "mlflow", displayName: "MLflow", level: "Intermediate", stars: 3, category: "MLOps", description: "Experiment Tracking" },
    { name: "weightsandbiases", displayName: "Weights & Biases", level: "Intermediate", stars: 3, category: "MLOps", description: "ML Monitoring" },
    { name: "dvc", displayName: "DVC", level: "Familiar", stars: 2, category: "MLOps", description: "Data Version Control" },
    { name: "git", displayName: "Git", level: "Proficient", stars: 4, category: "MLOps", description: "Version Control" },
    { name: "github", displayName: "GitHub", level: "Proficient", stars: 4, category: "MLOps", description: "Code Collaboration" },
    { name: "redis", displayName: "Redis", level: "Familiar", stars: 2, category: "MLOps", description: "Feature Store/Cache" },
    { name: "onnx", displayName: "ONNX", level: "Familiar", stars: 2, category: "MLOps", description: "Model Optimization" },

    // Cloud ML Platforms
    { name: "googlecloud", displayName: "GCP (Vertex AI)", level: "Intermediate", stars: 3, category: "Cloud ML", description: "ML Deployment" },
    { name: "amazonaws", displayName: "AWS (SageMaker)", level: "Intermediate", stars: 3, category: "Cloud ML", description: "ML Services" },
    { name: "microsoftazure", displayName: "Azure ML", level: "Familiar", stars: 2, category: "Cloud ML", description: "ML Platform" },

    // Data Science & Processing
    { name: "python", displayName: "Python", level: "Proficient", stars: 4, category: "Data Science", description: "Primary Language" },
    { name: "scikitlearn", displayName: "scikit-learn", level: "Proficient", stars: 4, category: "Data Science", description: "Classical ML" },
    { name: "pandas", displayName: "Pandas", level: "Proficient", stars: 4, category: "Data Science", description: "Data Manipulation" },
    { name: "numpy", displayName: "NumPy", level: "Proficient", stars: 4, category: "Data Science", description: "Numerical Computing" },
    { name: "jupyter", displayName: "Jupyter", level: "Proficient", stars: 4, category: "Data Science", description: "Interactive Notebooks" },
    { name: "xgboost", displayName: "XGBoost", level: "Intermediate", stars: 3, category: "Data Science", description: "Gradient Boosting" },
    { name: "r", displayName: "R", level: "Intermediate", stars: 3, category: "Data Science", description: "Statistical Analysis" },
    { name: "plotly", displayName: "Plotly", level: "Intermediate", stars: 3, category: "Data Science", description: "Interactive Viz" },
    { name: "postgresql", displayName: "PostgreSQL", level: "Intermediate", stars: 3, category: "Data Science", description: "Data Storage" },
    { name: "mongodb", displayName: "MongoDB", level: "Intermediate", stars: 3, category: "Data Science", description: "Document DB" },
    { name: "visualstudiocode", displayName: "VS Code", level: "Proficient", stars: 4, category: "Data Science", description: "Development" },
];

const categories: (Category | "All")[] = ["All", "Deep Learning", "LLMs & Agents", "MLOps", "Cloud ML", "Data Science"];

const categoryColors: Record<Category, string> = {
    "Deep Learning": "from-blue-500/5 to-blue-500/10",
    "LLMs & Agents": "from-purple-500/5 to-purple-500/10",
    "MLOps": "from-green-500/5 to-green-500/10",
    "Cloud ML": "from-orange-500/5 to-orange-500/10",
    "Data Science": "from-teal-500/5 to-teal-500/10",
};

const stats = [
    { value: "35+", label: "AI/ML Technologies" },
    { value: "12", label: "Production Ready" },
    { value: "6", label: "Frameworks Mastered" },
];

export default function TechStack() {
    const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

    const filteredTech = activeCategory === "All"
        ? technologies
        : technologies.filter(t => t.category === activeCategory);

    return (
        <section id="tech-stack" className="py-24 px-5 bg-card">
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-sm uppercase tracking-wider text-muted mb-2">
                        Tech Stack
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        AI/ML Technology Arsenal
                    </h2>
                    <p className="text-lg text-muted max-w-[800px] mx-auto">
                        Production ML tools and frameworks I use to build intelligent systems
                    </p>
                </motion.div>

                {/* Stats Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12 mb-10 p-6 rounded-xl bg-background border border-border max-w-[600px] mx-auto"
                >
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted">{stat.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Skill Level Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="flex items-center justify-center gap-3 mb-8 p-3 px-5 rounded-lg bg-background border border-border max-w-[700px] mx-auto"
                >
                    <Info className="w-4 h-4 text-muted flex-shrink-0" />
                    <p className="text-xs text-muted">
                        <span className="text-primary">★★★★</span> Proficient - Production experience &nbsp;|&nbsp;
                        <span className="text-primary">★★★</span> Intermediate - Active learning &nbsp;|&nbsp;
                        <span className="text-primary">★★</span> Familiar - Working knowledge
                    </p>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-2 mb-8 overflow-x-auto pb-2"
                >
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`
                                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap
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
                    Showing {filteredTech.length} of {technologies.length} technologies
                </motion.p>

                {/* Tech Cards Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredTech.map((tech, index) => (
                            <motion.div
                                key={`${tech.name}-${tech.displayName}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: index * 0.03 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                className={`
                                    group relative p-5 rounded-xl border border-border bg-background
                                    flex flex-col items-center justify-center text-center
                                    min-h-[180px] md:min-h-[200px]
                                    transition-all duration-200
                                    hover:shadow-lg hover:border-primary/30
                                    hover:bg-gradient-to-br ${categoryColors[tech.category]}
                                    cursor-pointer
                                `}
                            >
                                {/* Tech Icon */}
                                <div className="mb-3 transition-transform duration-300 group-hover:scale-110">
                                    <TechIcon name={tech.name} size={40} />
                                </div>

                                {/* Display Name */}
                                <h3 className="font-semibold text-sm text-foreground mb-1">
                                    {tech.displayName}
                                </h3>

                                {/* Level */}
                                <p className="text-xs text-muted mb-2">
                                    {tech.level}
                                </p>

                                {/* Stars */}
                                <div className="flex gap-0.5 mb-2">
                                    {Array.from({ length: tech.stars }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={12}
                                            className="fill-primary text-primary"
                                        />
                                    ))}
                                </div>

                                {/* Description */}
                                <p className="text-xs text-muted">
                                    {tech.description}
                                </p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-center text-sm text-muted italic mt-12"
                >
                    Continuously expanding expertise through production projects and open source contributions
                </motion.p>
            </div>
        </section>
    );
}
