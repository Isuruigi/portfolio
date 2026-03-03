# Quick Start Guide

Choose your free hosting platform and follow the steps:

## 🥇 Oracle Cloud (Best - Forever Free)
**Specs:** 1GB RAM, 1 vCPU, Always On

1. Create Oracle Cloud account: https://oracle.com/cloud/free
2. Create Ubuntu VM (VM.Standard.E2.1.Micro)
3. Connect via SSH
4. Run setup script:
   ```bash
   wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/backend/oracle-setup.sh
   chmod +x oracle-setup.sh
   ./oracle-setup.sh
   ```
5. Access: `http://YOUR_VM_IP:8000`

**Full guide:** See [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md)

---

## 🤖 Hugging Face Spaces (Recommended - Best for AI/ML)
**Specs:** 2GB RAM, 2 vCPU, Free Forever

**Perfect for your chatbot!** 2GB RAM is more than enough for your LangChain + embeddings setup.

**📖 Complete Step-by-Step Guide:** [HUGGINGFACE_DEPLOYMENT.md](HUGGINGFACE_DEPLOYMENT.md)

**Quick Summary:**
1. Create account: https://huggingface.co/join
2. Create new Space: https://huggingface.co/new-space (Docker SDK, CPU basic)
3. Clone, copy backend files, and push
4. Set `GROQ_API_KEY` secret in Settings
5. Wait for build (~5-10 min)
6. Access: `https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space`

---

## ✈️ Fly.io (Fastest Deploy)
**Specs:** 3x 256MB RAM VMs, Free Forever

```bash
# Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Deploy (from backend folder)
cd backend
flyctl auth login
flyctl deploy
flyctl secrets set GROQ_API_KEY=your_key_here
flyctl status
```

---

## 🔵 Render (Simple but Limited)
**Specs:** 750 hours/month, 512MB RAM

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Comparison

| Platform | Free Tier | Setup Time | Complexity |
|----------|-----------|------------|------------|
| Oracle Cloud | Forever | 30 min | ⭐⭐⭐⭐ |
| Hugging Face | Forever | 15 min | ⭐⭐⭐ |
| Fly.io | Forever | 5 min | ⭐⭐ |
| Render | 750 hrs/mo | 10 min | ⭐ |

**Recommendation:** 
- **Best specs:** Oracle Cloud
- **Best for AI:** Hugging Face  
- **Fastest:** Fly.io
