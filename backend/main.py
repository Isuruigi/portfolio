"""
Portfolio AI Chatbot Backend
FastAPI + LangChain RAG with Groq LLM
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from typing import List, Optional
import os
from datetime import datetime
import uuid
from collections import defaultdict
from time import time
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# LangChain imports
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain.schema import Document

# Initialize FastAPI
app = FastAPI(
    title="Portfolio AI Chatbot",
    description="AI assistant for Isuru's portfolio",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
qa_chain = None
vector_store = None
conversations = {}
conversation_last_seen = {}

# Per-conversation history limits
HISTORY_TURNS = 6
CONVERSATION_TTL = 2 * 60 * 60  # seconds


def prune_conversations():
    """Drop conversations idle longer than the TTL so memory stays bounded."""
    cutoff = time() - CONVERSATION_TTL
    for cid in [c for c, seen in conversation_last_seen.items() if seen < cutoff]:
        conversations.pop(cid, None)
        conversation_last_seen.pop(cid, None)

# Model is configurable so a Groq retirement can be fixed without a code change
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Real health state: whether the LLM actually answered, not just whether objects exist
llm_ok = False
last_error = None

# Rate limiting
rate_limit_store = defaultdict(list)

def check_rate_limit(ip: str, limit: int = 20, window: int = 600) -> bool:
    """Check if IP has exceeded rate limit (20 requests per 10 minutes)"""
    now = time()
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < window]
    
    if len(rate_limit_store[ip]) >= limit:
        return False
    
    rate_limit_store[ip].append(now)
    return True

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    conversation_id: str

# Portfolio-related keywords for guardrails
PORTFOLIO_KEYWORDS = [
    "isuru", "experience", "skill", "project", "education", "work", 
    "langchain", "pytorch", "ml", "ai", "python", "hire", "available",
    "contact", "background", "certification", "github", "portfolio",
    "remote", "role", "job", "resume", "cv", "machine learning",
    "deep learning", "mlops", "fastapi", "docker", "cloud", "gcp",
    "aws", "data", "engineer", "developer", "freelance", "open source",
    "crypto", "market", "fraud", "monitoring", "email", "linkedin",
    "location", "colombo", "sri lanka", "university", "student",
    # Project names - these were missing, so "Tell me about NEXUS" was deflected
    "nexus", "personaplex", "graphrag", "rag", "exam portal", "itm",
    "research agent", "churn", "telco", "lora", "adaptive", "medicore",
    "kapruka", "n8n", "automation", "workflow", "voice", "agent",
    # Employers / programs
    "veracity", "buildr", "bootcamp", "zuu crew", "teaching", "assistant",
    # Stack terms
    "llm", "vllm", "langgraph", "qdrant", "neo4j", "redpanda", "dragonfly",
    "kubernetes", "vector", "graph", "tech", "stack", "tool", "framework",
    # Common phrasings that carry no other keyword
    "service", "offer", "hire", "build", "built", "latest", "recent",
    "current", "who", "what do you", "tell me about", "your",
    # education phrasings the allowlist previously missed
    "study", "studied", "degree", "academic", "graduate", "college", "course",
    "faculty", "campus",
    # writing and problem-solving phrasings. Safe to allow broadly because
    # OFFTOPIC_PATTERNS is evaluated first and catches task requests.
    "blog", "post", "article", "medium", "writing", "written", "problem", "solve", "challenge", "approach"
]

# Task requests and injection attempts that would otherwise slip through on a
# single tech keyword, e.g. "write python code to sort a list" matches "python".
# Checked before the allowlist, so these are rejected regardless of keywords.
OFFTOPIC_PATTERNS = [
    "write me a", "write a poem", "write an essay", "write python", "write code",
    "write some code", "code to sort", "code that does", "generate a poem",
    "tell me a joke", "poem about", "essay about", "story about", "recipe for",
    "capital of", "translate this", "translate the following",
    # prompt-injection probes
    "ignore previous", "ignore all previous", "disregard previous",
    "system prompt", "pretend you are", "act as if you", "you are now",
]


def is_portfolio_related(query: str) -> bool:
    """Check if query is related to portfolio"""
    query_lower = query.lower()
    if any(pattern in query_lower for pattern in OFFTOPIC_PATTERNS):
        return False
    return any(keyword in query_lower for keyword in PORTFOLIO_KEYWORDS)

def load_portfolio_data() -> List[Document]:
    """Load and parse portfolio knowledge base"""
    # Try multiple possible paths
    possible_paths = [
        Path(__file__).parent / "portfolio-knowledge.json",  # Same directory (Railway)
        Path(__file__).parent.parent / "src" / "lib" / "data" / "portfolio-knowledge.json",
        Path(__file__).parent / ".." / "src" / "lib" / "data" / "portfolio-knowledge.json",
        Path("../src/lib/data/portfolio-knowledge.json"),
        Path("src/lib/data/portfolio-knowledge.json"),
    ]
    
    data = None
    for path in possible_paths:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"[+] Loaded portfolio data from: {path}")
                break
        except FileNotFoundError:
            continue
    
    if data is None:
        raise FileNotFoundError("Could not find portfolio-knowledge.json")
    
    documents = []
    
    # Personal info
    personal = data.get("personal_info", {})
    personal_text = f"""
    Name: {personal.get('name', 'Isuru Chathuranga')}
    Title: {personal.get('title', 'AI/ML Engineer')}
    Location: {personal.get('location', 'Colombo, Sri Lanka')}
    Email: {personal.get('email', 'isuruigic@gmail.com')}
    LinkedIn: {personal.get('linkedin', '')}
    GitHub: {personal.get('github', '')}
    Summary: {personal.get('summary', '')}
    Availability: {personal.get('availability', '')}
    """
    documents.append(Document(
        page_content=personal_text,
        metadata={"source": "personal_info", "type": "about"}
    ))
    
    # Skills
    skills = data.get("skills", {})
    for category, skill_data in skills.items():
        skill_text = f"""
        Skill Category: {category.replace('_', ' ').title()}
        Tools/Frameworks: {', '.join(skill_data.get('tools', skill_data.get('frameworks', skill_data.get('platforms', []))))}
        Description: {skill_data.get('description', '')}
        """
        documents.append(Document(
            page_content=skill_text,
            metadata={"source": "skills", "type": category}
        ))
    
    # Projects
    for project in data.get("projects", []):
        project_text = f"""
        Project: {project.get('name', '')}
        Status: {project.get('status', '')}
        Description: {project.get('description', '')}
        Tech Stack: {', '.join(project.get('tech_stack', []))}
        Achievements: {'. '.join(project.get('achievements', []))}
        GitHub: {project.get('github', '')}
        """
        documents.append(Document(
            page_content=project_text,
            metadata={"source": "projects", "type": "project", "name": project.get('name', '')}
        ))
    
    # Experience
    for exp in data.get("experience", []):
        exp_text = f"""
        Role: {exp.get('title', '')}
        Company: {exp.get('company', '')}
        Period: {exp.get('period', '')}
        Description: {exp.get('description', '')}
        Key Contributions: {'. '.join(exp.get('contributions', exp.get('achievements', [])))}
        """
        documents.append(Document(
            page_content=exp_text,
            metadata={"source": "experience", "type": "role", "name": exp.get('title', '')}
        ))
    
    # Education
    for edu in data.get("education", []):
        edu_text = f"""
        Degree: {edu.get('degree', '')}
        Institution: {edu.get('institution', '')}
        Specialization: {edu.get('specialization', '')}
        Period: {edu.get('period', '')}
        Status: {edu.get('status', '')}
        """
        documents.append(Document(
            page_content=edu_text,
            metadata={"source": "education", "type": "degree"}
        ))
    
    # Certifications
    certs = data.get("certifications", [])
    if certs:
        cert_text = f"""
        Certifications:
        {chr(10).join(['- ' + cert for cert in certs])}
        """
        documents.append(Document(
            page_content=cert_text,
            metadata={"source": "certifications", "type": "credentials"}
        ))
    
    # FAQs - Important for common questions
    for faq in data.get("faqs", []):
        faq_text = f"""
        Question: {faq.get('question', '')}
        Answer: {faq.get('answer', '')}
        """
        documents.append(Document(
            page_content=faq_text,
            metadata={"source": "faq", "type": "qa"}
        ))
    
    # Services
    for svc in data.get("services", []):
        svc_text = f"""
        Service: {svc.get('name', '')}
        Focus: {svc.get('subhead', '')}
        Description: {svc.get('description', '')}
        Use Cases: {', '.join(svc.get('use_cases', []))}
        """
        documents.append(Document(
            page_content=svc_text,
            metadata={"source": "services", "type": "service", "name": svc.get('name', '')}
        ))

    # Availability
    avail = data.get("availability", {})
    avail_text = f"""
    Current Status: {avail.get('status', '')}
    Collaborations: {avail.get('collaborations', '')}
    Response Time: {avail.get('response_time', 'Within 24 hours')}
    Preferred Contact: {avail.get('preferred_contact', 'Email or LinkedIn')}
    Timezone: {avail.get('timezone', 'GMT+5:30')}
    Work Hours: {avail.get('work_hours', 'Flexible')}
    """
    documents.append(Document(
        page_content=avail_text,
        metadata={"source": "availability", "type": "contact"}
    ))
    
    return documents

def initialize_chatbot():
    """Initialize the RAG chatbot"""
    global qa_chain, vector_store, llm_ok, last_error

    print("[*] Initializing Axon - portfolio agent...")

    # Load documents
    documents = load_portfolio_data()
    print(f"[*] Loaded {len(documents)} document chunks")

    # Split documents if needed
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    split_docs = text_splitter.split_documents(documents)
    print(f"[*] Split into {len(split_docs)} chunks")

    # Create embeddings
    print("[*] Loading embeddings model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'}
    )
    print("[+] Embeddings model loaded")

    # Create vector store
    vector_store = FAISS.from_documents(split_docs, embeddings)
    print("[+] Vector store created")

    # Initialize LLM
    # Groq retires models periodically (llama-3.3-70b-versatile was decommissioned and
    # started returning 404 model_not_found). Keep this overridable via env so a future
    # retirement can be fixed by changing a secret instead of redeploying code.
    llm = ChatGroq(
        model=GROQ_MODEL,
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7,
        max_tokens=1024
    )

    # Axon system prompt
    from langchain.prompts import PromptTemplate

    system_template = """You are Axon, the AI agent on Isuru Chathuranga's portfolio website. You answer visitors' questions about Isuru's work.

VOICE:
- Clear, confident and warm, like a sharp colleague introducing Isuru. No emojis, no hype.
- Speak about Isuru in the third person ("he built", "his work").
- Lead with the direct answer, then the detail. Two short paragraphs at most; use a short bullet list only when listing several things.
- Be specific: name the exact project, technology or result.

FACTS:
- Use only the context below. Never invent numbers, dates, clients, salaries, rates or availability.
- If the context doesn't cover it, say so plainly and suggest the contact form or isuruigic@gmail.com.
- Reply in the language the visitor writes in (English, Sinhala or Tamil).

Context from portfolio:
{context}

Question: {question}

Answer as Axon."""

    prompt = PromptTemplate(
        template=system_template,
        input_variables=["context", "question"]
    )

    # Create QA chain with the Axon prompt. No shared memory: each request passes its own
    # conversation's history, so one visitor's questions never leak into another's answers.
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": prompt},
        verbose=False
    )

    # Probe the model once at startup. Building the chain succeeds even when the
    # configured model no longer exists, so without this the service reports healthy
    # and then 500s on every question.
    try:
        llm.invoke("ping")
        llm_ok = True
        print(f"[+] LLM reachable: {GROQ_MODEL}")
    except Exception as e:
        llm_ok = False
        last_error = f"{type(e).__name__}: {e}"
        print(f"[!] LLM PROBE FAILED for '{GROQ_MODEL}': {last_error}")
        print("[!] /chat will return 500 until this is resolved.")

    print("[+] Axon initialized!")
    print("[+] Chatbot ready!")

@app.on_event("startup")
async def startup_event():
    """Initialize chatbot on startup"""
    try:
        initialize_chatbot()
    except Exception as e:
        print(f"[!] Error initializing chatbot: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Axon - portfolio AI agent API",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Previously this reported "healthy" purely because the objects existed, so a
    # decommissioned model looked fine while every question returned a 500.
    healthy = vector_store is not None and qa_chain is not None and llm_ok
    return {
        "status": "healthy" if healthy else "degraded",
        "assistant": "Axon",
        "vector_store_loaded": vector_store is not None,
        "qa_chain_loaded": qa_chain is not None,
        "llm_ok": llm_ok,
        "model": GROQ_MODEL,
        "last_error": last_error,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, req: Request):
    """Main chat endpoint"""
    global qa_chain, conversations
    
    # Rate limiting
    client_ip = req.client.host if req.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a few minutes."
        )
    
    if qa_chain is None:
        raise HTTPException(
            status_code=503,
            detail="Axon is still waking up. Please try again in a moment."
        )
    
    # Get or create conversation ID
    conversation_id = request.conversation_id or str(uuid.uuid4())
    message_lower = request.message.lower().strip()
    
    # Handle greetings
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
    if message_lower in greetings:
        return ChatResponse(
            response="Hi, I'm Axon, the AI agent on Isuru's portfolio. Ask me about his projects, how he builds, where he teaches, or whether he's open to new work.",
            sources=[],
            conversation_id=conversation_id
        )
    
    # Handle "how are you" type questions
    if 'how are you' in message_lower or "what's up" in message_lower or "whats up" in message_lower:
        return ChatResponse(
            response="I'm doing great, thanks for asking! I'm always excited to talk about Isuru's work in AI/ML engineering. He's been building some really cool production systems lately!\n\nWhat would you like to know about his projects or skills?",
            sources=[],
            conversation_id=conversation_id
        )
    
    # Check if query is portfolio-related
    if not is_portfolio_related(request.message):
        return ChatResponse(
            response="That's an interesting question, but I'm specifically here to help you learn about Isuru's AI/ML engineering work!\n\nI can tell you about:\n- Technical skills and expertise\n- Production ML projects\n- Open source contributions\n- Education and certifications\n- Availability for remote opportunities\n\nWhat would you like to explore?",
            sources=[],
            conversation_id=conversation_id
        )
    
    try:
        # Get response from chain, with only this conversation's recent history
        prune_conversations()
        history = [
            (turn["question"], turn["answer"])
            for turn in conversations.get(conversation_id, [])[-HISTORY_TURNS:]
        ]
        result = qa_chain({
            "question": request.message,
            "chat_history": history,
        })
        
        # Extract sources
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                source = doc.metadata.get("source", "unknown")
                name = doc.metadata.get("name", "")
                source_str = f"{source}"
                if name:
                    source_str += f": {name}"
                if source_str not in sources:
                    sources.append(source_str)
        
        # Store conversation
        if conversation_id not in conversations:
            conversations[conversation_id] = []
        conversations[conversation_id].append({
            "question": request.message,
            "answer": result["answer"],
            "timestamp": datetime.utcnow().isoformat()
        })
        conversations[conversation_id] = conversations[conversation_id][-HISTORY_TURNS:]
        conversation_last_seen[conversation_id] = time()
        
        return ChatResponse(
            response=result["answer"],
            sources=sources[:3],
            conversation_id=conversation_id
        )
        
    except Exception as e:
        global last_error
        last_error = f"{type(e).__name__}: {e}"
        print(f"[!] Error in chat ({GROQ_MODEL}): {last_error}")
        raise HTTPException(
            status_code=500,
            detail="Sorry, I encountered an error. Please try again."
        )

voice_rate_store = defaultdict(list)


@app.post("/voice/token")
async def voice_token(req: Request):
    """Issue a single-use Gemini Live token that can only run an Axon call."""
    client_ip = req.client.host if req.client else "unknown"
    now = time()
    voice_rate_store[client_ip] = [t for t in voice_rate_store[client_ip] if now - t < 600]
    if len(voice_rate_store[client_ip]) >= 3:
        raise HTTPException(status_code=429, detail="You've started a few calls already. Try again in a few minutes, or chat instead.")

    try:
        import voice  # imported here so a voice problem can never take the chat down
    except Exception as e:
        print(f"[!] Voice unavailable: {e}")
        raise HTTPException(status_code=503, detail="Voice calls are unavailable right now. Chat still works.")

    if voice.daily_cap_reached():
        raise HTTPException(status_code=503, detail="Axon has taken all its calls for today. Chat still works.")

    try:
        issued = voice.create_voice_token()
    except Exception as e:
        print(f"[!] Voice token failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Couldn't start a call right now. Chat still works.")

    voice_rate_store[client_ip].append(now)
    return issued


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
