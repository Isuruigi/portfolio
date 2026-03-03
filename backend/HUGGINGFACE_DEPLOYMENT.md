# 🤗 Deploy Your Chatbot to Hugging Face Spaces

**Complete Guide for Deploying Your FastAPI Chatbot Backend**

Hugging Face Spaces is perfect for your AI chatbot with **2GB RAM, 2 vCPU, and optimized for ML workloads** - all **FREE FOREVER**!

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ Hugging Face account (free)
- ✅ Git installed on your Windows machine
- ✅ Your Groq API key
- ✅ Your backend code ready

---

## 🚀 Deployment Steps

### Step 1: Create Hugging Face Account

1. Go to [huggingface.co/join](https://huggingface.co/join)
2. Sign up with email or GitHub
3. Verify your email address
4. **No credit card required!** ✨

---

### Step 2: Create a New Space

1. Click your profile picture → **"New Space"**
   
   Or go directly to: [huggingface.co/new-space](https://huggingface.co/new-space)

2. Fill in the Space configuration:

   | Setting | Value | Why? |
   |---------|-------|------|
   | **Owner** | Your username | Your personal account |
   | **Space name** | `portfolio-chatbot-backend` | Or any name you prefer |
   | **License** | MIT | Open source license |
   | **Select the Space SDK** | **Docker** | ⚠️ IMPORTANT: Choose Docker! |
   | **Space hardware** | **CPU basic** | Free tier - perfect for your needs |
   | **Visibility** | Public or Private | Your choice |

3. Click **"Create Space"**

4. You'll see instructions - keep this page open!

---

### Step 3: Verify Your Dockerfile

Your backend already has a `Dockerfile` that I created. Let's verify it:

**Check:** `d:\Projects\My porthfolio\backend\Dockerfile`

It should look like this:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Hugging Face Spaces runs on port 7860 by default
ENV PORT=7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# Expose port
EXPOSE 7860

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

✅ This is already configured correctly!

---

### Step 4: Clone Your Space Locally

From your Hugging Face Space page, you'll see a clone URL like:
```
https://huggingface.co/spaces/YOUR_USERNAME/portfolio-chatbot-backend
```

**Open PowerShell** and run:

```powershell
# Navigate to a working directory (NOT your project folder)
cd C:\Users\IPK\Documents

# Clone your Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/portfolio-chatbot-backend
cd portfolio-chatbot-backend
```

Replace `YOUR_USERNAME` with your actual Hugging Face username!

---

### Step 5: Copy Your Backend Code

Now copy all your backend files to the Space repository:

```powershell
# Copy all backend files
Copy-Item -Path "d:\Projects\My porthfolio\backend\*" -Destination . -Recurse -Force

# Verify files are copied
ls
```

You should see:
- ✅ `Dockerfile`
- ✅ `main.py`
- ✅ `requirements.txt`
- ✅ `portfolio-knowledge.json`
- ✅ `.env` (we'll handle this differently)
- ✅ Other backend files

---

### Step 6: Remove Sensitive Files from Git

**Important:** Don't commit your `.env` file!

```powershell
# Create .gitignore if it doesn't exist
if (!(Test-Path .gitignore)) {
    New-Item .gitignore -ItemType File
}

# Add .env to .gitignore
Add-Content .gitignore "`n.env`n__pycache__/`n*.pyc`nvenv/"
```

---

### Step 7: Create README for Your Space

Create a `README.md` in the Space directory to describe your chatbot:

```powershell
New-Item README.md -ItemType File -Force
```

Add this content:

```markdown
---
title: Portfolio Chatbot Backend
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Vira - Portfolio AI Chatbot Backend

AI-powered chatbot backend using LangChain RAG with Groq LLM.

## Features
- 🤖 RAG-based conversational AI
- ⚡ Fast responses with Groq LLM (Llama 3.3)
- 🔍 FAISS vector store for semantic search
- 🚀 FastAPI for production-ready API

## API Endpoints
- `GET /health` - Health check
- `POST /chat` - Chat with Vira
- `GET /docs` - API documentation

## Tech Stack
- FastAPI
- LangChain
- Groq (Llama 3.3 70B)
- FAISS
- Sentence Transformers
```

---

### Step 8: Commit and Push to Hugging Face

```powershell
# Configure git (first time only)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add all files
git add .

# Commit
git commit -m "Deploy chatbot backend to Hugging Face Spaces"

# Push to Hugging Face
git push
```

**Note:** You may need to authenticate. Hugging Face will prompt you to create an access token.

#### If prompted for authentication:

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **"New token"**
3. Name: `spaces-deployment`
4. Role: **Write**
5. Click **"Generate token"**
6. Copy the token
7. Use it as your password when git asks

---

### Step 9: Set Your Groq API Key (Secret)

**IMPORTANT:** Don't put your API key in the code! Use Hugging Face Secrets.

1. Go to your Space page: `https://huggingface.co/spaces/YOUR_USERNAME/portfolio-chatbot-backend`
2. Click **"Settings"** tab
3. Scroll to **"Repository secrets"**
4. Click **"New secret"**
5. Add:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your actual Groq API key (e.g., `gsk_xxxxxxxxxxxx`)
6. Click **"Add"**

---

### Step 10: Wait for Build

1. Go to your Space's main page
2. You'll see **"Building..."** status
3. Click **"Logs"** to watch the build process

**Build time:** Usually 5-10 minutes first time

#### What happens during build:
1. ✅ Docker image is built
2. ✅ Python dependencies installed
3. ✅ Sentence Transformers model downloaded
4. ✅ FAISS vector store initialized
5. ✅ FastAPI server starts

---

### Step 11: Verify Deployment

Once the build completes, your Space will show **"Running"** ✅

#### Test your endpoints:

Your Space URL will be:
```
https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space
```

**Test in browser or PowerShell:**

```powershell
# Health check
curl https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space/health

# API docs
# Open in browser: https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space/docs
```

**Expected health response:**
```json
{
  "status": "healthy",
  "assistant": "Vira",
  "vector_store_loaded": true,
  "qa_chain_loaded": true,
  "timestamp": "2026-02-07T10:40:23.123456"
}
```

---

### Step 12: Test the Chatbot

Test a chat request:

```powershell
# Create test request
$body = @{
    message = "What projects has Isuru built?"
    conversation_id = $null
} | ConvertTo-Json

# Send request
Invoke-RestMethod `
    -Uri "https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

You should get a response from Vira about your projects! 🎉

---

### Step 13: Update Your Frontend

Now update your portfolio frontend to use the new backend URL.

**Find your chatbot component** (likely `src/components/Chatbot.tsx` or similar):

**Before:**
```typescript
const API_URL = "https://your-old-railway-backend.up.railway.app";
```

**After:**
```typescript
const API_URL = "https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space";
```

Replace `YOUR_USERNAME` with your actual Hugging Face username!

---

## 🔄 How to Update Your Chatbot

When you make changes to your code:

```powershell
# Navigate to your Space directory
cd C:\Users\IPK\Documents\portfolio-chatbot-backend

# Copy updated files from your project
Copy-Item -Path "d:\Projects\My porthfolio\backend\main.py" -Destination . -Force
# Or copy other specific files you changed

# Commit and push
git add .
git commit -m "Update chatbot logic"
git push
```

Hugging Face will automatically rebuild your Space!

---

## 📊 Monitoring Your Space

### View Logs
1. Go to your Space page
2. Click **"Logs"** tab
3. See real-time logs from your application

### View Usage
1. Click **"Analytics"** tab (if available)
2. See request counts and performance

### Restart Your Space
If something goes wrong:
1. Go to **"Settings"**
2. Click **"Factory reboot"**
3. Space will rebuild from scratch

---

## 🛟 Troubleshooting

### Issue: Build Fails with "Out of Memory"

**Unlikely with 2GB**, but if it happens:

**Solution:** Optimize your Dockerfile:
```dockerfile
# Add to Dockerfile after installing requirements
RUN pip cache purge
```

### Issue: "Port 7860 already in use"

**Solution:** Hugging Face expects port 7860. Make sure your Dockerfile uses:
```dockerfile
ENV PORT=7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Issue: "GROQ_API_KEY not found"

**Cause:** Secret not set or named incorrectly

**Solution:**
1. Go to Settings → Repository secrets
2. Verify secret name is exactly: `GROQ_API_KEY`
3. Click "Edit" and re-save if needed
4. Factory reboot the Space

### Issue: Chatbot Returns "Service Unavailable"

**Cause:** Vector store still loading

**Solution:** 
- First startup takes 60-90 seconds to load embeddings
- Wait and try again
- Check logs for "Vira initialized!" message

### Issue: CORS Errors from Frontend

**Solution:** Update `main.py` CORS settings:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "https://your-frontend.pages.dev",  # If using Cloudflare Pages
        "http://localhost:3000"  # For local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then commit and push the change.

---

## 🎯 Advanced: Custom Domain (Optional)

Want a custom domain instead of `hf.space`?

1. Go to Space **Settings**
2. Scroll to **"Custom domain"**
3. Add your domain (e.g., `api.your-portfolio.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic)

---

## 💡 Tips for Best Performance

### 1. Optimize Docker Image Size
Your current setup is good, but you can make builds faster:

```dockerfile
# Use multi-stage build (optional optimization)
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .
ENV PORT=7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### 2. Add a .dockerignore File

Create `.dockerignore` to speed up builds:

```
.git
.env
__pycache__
*.pyc
venv/
.venv/
*.md
.gitignore
```

### 3. Monitor Cold Starts

Free tier might sleep after inactivity. To prevent:
- Upgrade to persistent space ($9/month)
- Or accept ~10s cold start (still better than Render's 60s!)

---

## ✅ Deployment Checklist

- [ ] Created Hugging Face account
- [ ] Created new Docker Space
- [ ] Cloned Space repository locally
- [ ] Copied all backend files
- [ ] Created/verified Dockerfile
- [ ] Created README.md with Space metadata
- [ ] Committed and pushed to Hugging Face
- [ ] Set `GROQ_API_KEY` secret in Settings
- [ ] Build completed successfully
- [ ] `/health` endpoint returns healthy status
- [ ] `/docs` shows FastAPI documentation
- [ ] Test chat request returns valid response
- [ ] Updated frontend with new backend URL
- [ ] Tested chatbot from frontend

---

## 🎉 You're Live!

Your chatbot is now deployed on Hugging Face Spaces with:
- ✅ **2GB RAM** - Plenty of headroom
- ✅ **No cold starts** - Fast responses
- ✅ **Free forever** - No trials or limits
- ✅ **Auto SSL** - Secure HTTPS
- ✅ **CI/CD** - Auto-deploy on git push

**Your Backend URL:**
```
https://YOUR_USERNAME-portfolio-chatbot-backend.hf.space
```

**Next Steps:**
1. Share your Space on your portfolio
2. Monitor usage in Analytics
3. Consider adding rate limiting for production use

---

## 📚 Additional Resources

- [Hugging Face Spaces Docs](https://huggingface.co/docs/hub/spaces)
- [Docker SDK Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [Space Settings Reference](https://huggingface.co/docs/hub/spaces-settings)

---

**Need Help?** 
- Check Space logs first
- Review [Hugging Face Community Forums](https://discuss.huggingface.co/)
- DM me with your error messages!

**Enjoy your free, production-ready AI chatbot backend! 🚀**
