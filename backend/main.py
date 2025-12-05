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
from langchain.memory import ConversationBufferMemory
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
    "location", "colombo", "sri lanka", "university", "student"
]

def is_portfolio_related(query: str) -> bool:
    """Check if query is related to portfolio"""
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in PORTFOLIO_KEYWORDS)

def load_portfolio_data() -> List[Document]:
    """Load and parse portfolio knowledge base"""
    # Try multiple possible paths
    possible_paths = [
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
    Availability: {personal.get('availability', 'Open to remote opportunities')}
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
    
    # Availability
    avail = data.get("availability", {})
    avail_text = f"""
    Availability Status: {avail.get('status', 'Actively seeking remote opportunities')}
    Start Date: {avail.get('start_date', 'Immediately available')}
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
    global qa_chain, vector_store

    print("[*] Initializing Vira - Portfolio Chatbot...")

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
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7,
        max_tokens=1024
    )

    # Create memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="answer"
    )

    # Enhanced Vira system prompt
    from langchain.prompts import PromptTemplate
    
    system_template = """You are Vira (Virtual Intelligence & RAG Assistant), Isuru Chathuranga's personal AI assistant.

PERSONALITY:
- Professional but friendly and approachable
- Enthusiastic about AI/ML technology
- Use emojis occasionally to add personality
- Speak in first person when discussing Isuru's work ("I", "my")

RESPONSE STYLE:
- Be conversational, not robotic
- Keep responses concise (2-3 paragraphs max)
- Be specific - mention exact technologies and achievements
- Show enthusiasm when discussing projects

GUIDELINES:
1. For skills: Group by category, highlight proficiency levels
2. For projects: Lead with impressive aspects and real-world impact
3. For availability: Emphasize openness to remote opportunities
4. If unsure: Be honest and offer to connect them with Isuru directly

Context from portfolio:
{context}

Question: {question}

Respond as Vira - be helpful and friendly!"""

    prompt = PromptTemplate(
        template=system_template,
        input_variables=["context", "question"]
    )

    # Create QA chain with Vira prompt
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
        memory=memory,
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": prompt},
        verbose=False
    )

    print("[+] Vira initialized!")
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
        "message": "Vira - Portfolio AI Chatbot API",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "assistant": "Vira",
        "vector_store_loaded": vector_store is not None,
        "qa_chain_loaded": qa_chain is not None,
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
            detail="Vira is still waking up. Please try again in a moment."
        )
    
    # Get or create conversation ID
    conversation_id = request.conversation_id or str(uuid.uuid4())
    message_lower = request.message.lower().strip()
    
    # Handle greetings
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
    if message_lower in greetings:
        return ChatResponse(
            response="Hey there! I'm Vira, Isuru's AI assistant! I'm here to tell you all about his AI/ML engineering expertise, projects, and experience.\n\nFeel free to ask me about:\n- His technical skills\n- Projects he's built\n- Work experience\n- Availability for opportunities\n\nWhat would you like to know?",
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
        # Get response from chain
        result = qa_chain({
            "question": request.message
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
        
        return ChatResponse(
            response=result["answer"],
            sources=sources[:3],
            conversation_id=conversation_id
        )
        
    except Exception as e:
        print(f"[!] Error in chat: {e}")
        raise HTTPException(
            status_code=500,
            detail="Sorry, I encountered an error. Please try again."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
