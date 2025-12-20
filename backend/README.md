# Vira - Portfolio AI Chatbot Backend

AI-powered chatbot backend for Isuru's portfolio using LangChain RAG with Groq LLM.

## Features
- 🤖 RAG-based conversational AI
- ⚡ Fast responses with Groq LLM (Llama 3.3)
- 🔍 FAISS vector store for semantic search
- 🚀 FastAPI for production-ready API

## Tech Stack
- FastAPI
- LangChain
- Groq (Llama 3.3 70B)
- FAISS
- Sentence Transformers

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
GROQ_API_KEY=your_groq_api_key
```

3. Run the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /health` - Health check
- `POST /chat` - Send a message to Vira

## Deployment

This backend is designed to be deployed on Railway. Set the `GROQ_API_KEY` environment variable in Railway.

## License

MIT
