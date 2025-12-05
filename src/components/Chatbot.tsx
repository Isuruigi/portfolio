"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Sparkles, User } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: string[];
}

const suggestionSets = [
    [
        "What projects has he built?",
        "Tell me about his AI/ML skills",
        "What's his experience with LangChain?",
        "Is he available for work?",
    ],
    [
        "What's his MLOps experience?",
        "Show me his best project",
        "What certifications does he have?",
        "What roles is he seeking?",
    ],
];

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hey there! I'm Vira, Isuru's AI assistant!\n\nI'm here to help you learn about his AI/ML engineering work, production systems, and technical expertise. Think of me as your guide to his portfolio!\n\nWhat would you like to explore?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string>();
    const [suggestedQuestions] = useState(
        suggestionSets[Math.floor(Math.random() * suggestionSets.length)]
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        const userMessage: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            if (data.conversation_id) {
                setConversationId(data.conversation_id);
            }

            const assistantMessage: Message = {
                role: "assistant",
                content: data.response,
                sources: data.sources,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Oops! I'm having trouble connecting right now. Please try again or reach out to Isuru directly at isuruigic@gmail.com",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl flex items-center justify-center ${isOpen ? "hidden" : ""}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
            >
                <MessageSquare className="w-7 h-7" />
                <span className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-100px)] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                                        V
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold flex items-center gap-1">
                                        Vira <Sparkles className="w-4 h-4" />
                                    </h3>
                                    <p className="text-white/80 text-xs">Isuru&apos;s AI Assistant • Online</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                                >
                                    {/* Avatar */}
                                    {message.role === "assistant" ? (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-white text-sm">
                                            V
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-zinc-600 flex-shrink-0 flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                    )}

                                    {/* Message bubble */}
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-zinc-800 text-zinc-100"
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-zinc-600">
                                                <p className="text-xs text-zinc-400">
                                                    Sources: {message.sources.join(", ")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading - Vira is thinking */}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                                        V
                                    </div>
                                    <div className="bg-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                        </div>
                                        <span className="text-sm text-zinc-400 ml-1">Vira is thinking</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggested Questions - only on first message */}
                        {messages.length === 1 && !isLoading && (
                            <div className="px-4 pb-2 space-y-2">
                                <p className="text-xs text-zinc-500">Try asking:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(q)}
                                            className="text-xs px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-full hover:bg-zinc-700 transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                {/* Quick actions */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleSend("What are your technical skills?")}
                                        className="text-xs px-3 py-1 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
                                    >
                                        Skills
                                    </button>
                                    <button
                                        onClick={() => handleSend("Show me your best project")}
                                        className="text-xs px-3 py-1 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
                                    >
                                        Projects
                                    </button>
                                    <button
                                        onClick={() => handleSend("How can I contact Isuru?")}
                                        className="text-xs px-3 py-1 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
                                    >
                                        Contact
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="border-t border-zinc-700 p-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask me anything about Isuru's work..."
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-600 text-center mt-2">
                                Powered by Vira • Built with LangChain & RAG
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
