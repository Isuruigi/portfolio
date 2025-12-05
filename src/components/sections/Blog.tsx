"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ExternalLink, BookOpen, TrendingUp } from "lucide-react";

interface BlogPost {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    categories: string[];
    thumbnail?: string | null;
    readingTime?: string;
    creator?: string;
}

export default function Blog() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch("/api/medium")
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setPosts(data.posts);
                } else {
                    setError(true);
                }
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    // Loading state
    if (loading) {
        return (
            <section id="blog" className="py-24 px-5">
                <div className="max-w-[1200px] mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <p className="text-sm uppercase tracking-wider text-muted mb-2">
                            Blog & Articles
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Latest Insights & Technical Writing
                        </h2>
                    </motion.div>

                    {/* Loading skeletons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-48 bg-secondary rounded-t-xl" />
                                <div className="p-6 border border-t-0 border-border rounded-b-xl bg-card">
                                    <div className="h-4 bg-secondary rounded w-3/4 mb-3" />
                                    <div className="h-3 bg-secondary rounded w-full mb-2" />
                                    <div className="h-3 bg-secondary rounded w-5/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Error state or no posts
    if (error || posts.length === 0) {
        return (
            <section id="blog" className="py-24 px-5">
                <div className="max-w-[1200px] mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <p className="text-sm uppercase tracking-wider text-muted mb-2">
                            Blog & Articles
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            Latest Insights & Technical Writing
                        </h2>
                        <p className="text-muted mb-8">
                            I write about AI/ML engineering, production systems, and software development
                        </p>

                        <div className="inline-flex flex-col items-center gap-4 p-8 border border-border rounded-xl bg-card">
                            <BookOpen className="w-16 h-16 text-muted" />
                            <p className="text-muted">
                                {error
                                    ? "Unable to load articles at the moment"
                                    : "No articles published yet"}
                            </p>

                            <a
                                href="https://medium.com/@isuruig"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-all duration-200"
                            >
                                Visit My Medium Profile
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>
        );
    }

    // Success state with posts
    const [featuredPost, ...gridPosts] = posts;

    return (
        <section id="blog" className="py-24 px-5 bg-card">
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
                        Blog & Articles
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Latest Insights & Technical Writing
                    </h2>
                    <p className="text-lg text-muted mb-6 max-w-[600px] mx-auto">
                        Sharing knowledge about AI/ML, production systems, and software engineering
                    </p>

                    <a
                        href="https://medium.com/@isuruig"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                        View All Articles on Medium
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </motion.div>

                {/* Featured Post */}
                {featuredPost && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mb-12"
                    >
                        <a
                            href={featuredPost.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-background"
                        >
                            {/* Featured Image */}
                            <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-purple-500/20">
                                {featuredPost.thumbnail ? (
                                    <img
                                        src={featuredPost.thumbnail}
                                        alt={featuredPost.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <BookOpen className="w-24 h-24 text-muted/30" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
                                        Featured
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 md:p-8">
                                {/* Meta */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-muted">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(featuredPost.pubDate).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                    {featuredPost.readingTime && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {featuredPost.readingTime}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                                    {featuredPost.title}
                                </h3>

                                {/* Description */}
                                <p className="text-muted mb-4 line-clamp-3">
                                    {featuredPost.description}
                                </p>

                                {/* Categories */}
                                {featuredPost.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <AnimatePresence>
                                            {featuredPost.categories.slice(0, 3).map((cat, i) => (
                                                <motion.span
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="px-2 py-1 text-xs bg-secondary rounded text-muted"
                                                >
                                                    {cat}
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Read More */}
                                <div className="flex items-center gap-2 text-primary font-medium">
                                    Read Full Article
                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </a>
                    </motion.div>
                )}

                {/* Grid Posts */}
                {gridPosts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {gridPosts.map((post, index) => (
                            <motion.a
                                key={index}
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                whileHover={{ y: -4 }}
                                className="group block border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 bg-background"
                            >
                                {/* Thumbnail */}
                                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-purple-500/10">
                                    {post.thumbnail ? (
                                        <img
                                            src={post.thumbnail}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <TrendingUp className="w-16 h-16 text-muted/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {/* Meta */}
                                    <div className="flex items-center gap-3 mb-3 text-xs text-muted">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(post.pubDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                        {post.readingTime && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {post.readingTime}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-muted mb-3 line-clamp-3">
                                        {post.description}
                                    </p>

                                    {/* Categories */}
                                    {post.categories.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {post.categories.slice(0, 2).map((cat, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 text-xs bg-secondary rounded text-muted"
                                                >
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Read More */}
                                    <div className="flex items-center gap-1 text-sm text-primary font-medium">
                                        Read More
                                        <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                )}

                {/* View All Link */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-center mt-12"
                >
                    <a
                        href="https://medium.com/@isuruig"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all duration-200 font-medium"
                    >
                        <BookOpen className="w-5 h-5" />
                        View All Articles on Medium
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
