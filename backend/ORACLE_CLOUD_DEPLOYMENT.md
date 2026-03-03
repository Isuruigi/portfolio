# 🚀 Deploy to Oracle Cloud & Other Free Platforms

After Railway trial ends, here are the **best truly free cloud hosting options** for your FastAPI chatbot backend.

---

## 🏆 Best Options Comparison

| Platform | Free Tier | RAM/CPU | Cold Starts | Complexity | Best For |
|----------|-----------|---------|-------------|------------|----------|
| **Oracle Cloud** | ♾️ Forever Free | 1GB RAM, 1 vCPU | ❌ None | ⭐⭐⭐⭐ Hard | Production apps |
| **Fly.io** | 3 VMs forever | 256MB RAM each | ⚠️ 5-10s | ⭐⭐ Easy | Quick deploy |
| **Hugging Face** | ♾️ Forever Free | 2GB RAM, 2 vCPU | ❌ None | ⭐⭐⭐ Medium | AI/ML apps |
| **Render** | 750 hrs/month | 512MB RAM | ⚠️ 30-60s | ⭐ Easiest | Side projects |

---

## 🥇 Option 1: Oracle Cloud (Best Free Option!)

### Why Oracle Cloud?
- ✅ **100% FREE FOREVER** - Not a trial!
- ✅ **1GB RAM + 1 vCPU** - Perfect for your chatbot
- ✅ **No cold starts** - Always running
- ✅ **200GB monthly bandwidth**
- ✅ **2 free VM instances** (ARM or x86)
- ⚠️ More complex setup than Render/Railway

### Prerequisites
1. Oracle Cloud account (requires credit card for verification, but **never charged**)
2. Your chatbot code
3. Groq API key

---

## 📋 Oracle Cloud Deployment Steps

### Step 1: Create Oracle Cloud Account
1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Click **"Start for free"**
3. Fill in details (requires credit card verification - **not charged**)
4. Verify email and set up account

### Step 2: Create a Compute Instance (VM)

1. **Login** to Oracle Cloud Console
2. Click **"Create a VM instance"**
3. Configure instance:

   | Setting | Value |
   |---------|-------|
   | **Name** | `portfolio-chatbot` |
   | **Image** | Ubuntu 22.04 (Always Free tier compatible) |
   | **Shape** | `VM.Standard.E2.1.Micro` (Always Free) |
   | **RAM** | 1GB |
   | **CPU** | 1 vCPU |
   | **Boot Volume** | 50GB |

4. **Download SSH Keys:**
   - Choose **"Generate a key pair for me"**
   - Download both private and public keys
   - Save as `oracle-key.key`

5. Click **"Create"**

### Step 3: Configure Firewall Rules

1. Go to **Networking** → **Virtual Cloud Networks** → Select your VCN
2. Click **Security Lists** → **Default Security List**
3. Add **Ingress Rules:**

   | Source CIDR | IP Protocol | Source Port Range | Destination Port | Description |
   |------------|-------------|-------------------|------------------|-------------|
   | `0.0.0.0/0` | TCP | All | 8000 | FastAPI |
   | `0.0.0.0/0` | TCP | All | 22 | SSH |
   | `0.0.0.0/0` | TCP | All | 80 | HTTP |
   | `0.0.0.0/0` | TCP | All | 443 | HTTPS |

### Step 4: Connect to Your VM

Get your VM's public IP from the console, then:

```bash
# Windows PowerShell
ssh -i path\to\oracle-key.key ubuntu@YOUR_VM_PUBLIC_IP

# Example:
ssh -i C:\Users\YourName\Downloads\oracle-key.key ubuntu@129.159.123.45
```

### Step 5: Set Up the Server

Once connected to your VM:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip git

# Install dependencies
sudo apt install -y build-essential python3-dev

# Create project directory
mkdir ~/chatbot-backend
cd ~/chatbot-backend
```

### Step 6: Transfer Your Code

**Option A: From GitHub (Recommended)**
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Navigate to backend folder
cd backend  # if backend is a subfolder
```

**Option B: Manual Upload (from Windows)**
```powershell
# From your local machine
scp -i path\to\oracle-key.key -r d:\Projects\My` porthfolio\backend ubuntu@YOUR_VM_IP:~/chatbot-backend
```

### Step 7: Install Python Dependencies

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 8: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add:
```env
GROQ_API_KEY=your_groq_api_key_here
PYTHON_VERSION=3.11.0
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 9: Test Your Chatbot

```bash
# Run manually first to test
uvicorn main:app --host 0.0.0.0 --port 8000

# Test from another terminal/browser:
# http://YOUR_VM_IP:8000/health
```

### Step 10: Set Up Systemd Service (Keep Running Forever)

Create a systemd service to auto-start your chatbot:

```bash
# Create service file
sudo nano /etc/systemd/system/chatbot.service
```

Add:
```ini
[Unit]
Description=Portfolio Chatbot Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/chatbot-backend
Environment="PATH=/home/ubuntu/chatbot-backend/venv/bin"
ExecStart=/home/ubuntu/chatbot-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save and enable:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable chatbot

# Start service
sudo systemctl start chatbot

# Check status
sudo systemctl status chatbot
```

### Step 11: Configure Ubuntu Firewall

```bash
# Allow port 8000
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Step 12: Access Your Chatbot

Your chatbot is now live at:
```
http://YOUR_VM_PUBLIC_IP:8000
```

Test endpoints:
- Health: `http://YOUR_VM_IP:8000/health`
- Docs: `http://YOUR_VM_IP:8000/docs`

---

## 🎯 Option 2: Fly.io (Simplest, Still Free)

You already have `fly.toml` configured! Deploy in **2 minutes:**

```bash
# Install Fly CLI (Windows PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Restart terminal, then:
cd d:\Projects\My` porthfolio\backend

# Login
flyctl auth login

# Deploy
flyctl deploy

# Set your API key
flyctl secrets set GROQ_API_KEY=your_key_here

# Get URL
flyctl status
```

**Free Tier:** 3 shared VMs, 160GB bandwidth/month

⚠️ **Downside:** Only 256MB RAM per VM (might be tight for your embeddings model)

---

## 🤖 Option 3: Hugging Face Spaces (Best for AI/ML)

Perfect for LangChain/RAG apps!

### Why Hugging Face?
- ✅ **FREE FOREVER** for community tier
- ✅ **2GB RAM, 2 vCPU** - Better than Fly.io!
- ✅ **No cold starts** on persistent spaces
- ✅ Built specifically for AI/ML apps
- ✅ Free SSL certificate

### Deployment Steps

1. **Create Account:** [huggingface.co](https://huggingface.co/join)

2. **Create New Space:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space)
   - Name: `portfolio-chatbot`
   - License: MIT
   - Select: **Docker** SDK
   - Hardware: **CPU basic** (free)

3. **Create `Dockerfile`** in your backend folder:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Hugging Face Spaces runs on port 7860
ENV PORT=7860

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

4. **Push to Space:**

```bash
cd d:\Projects\My` porthfolio\backend

# Clone your space
git clone https://huggingface.co/spaces/YOUR_USERNAME/portfolio-chatbot
cd portfolio-chatbot

# Copy your backend files
cp -r ../backend/* .

# Add Dockerfile (created above)
git add .
git commit -m "Initial deployment"
git push
```

5. **Set Secrets:**
   - Go to Space Settings → Variables and secrets
   - Add: `GROQ_API_KEY` = your key

Your chatbot will be live at:
```
https://YOUR_USERNAME-portfolio-chatbot.hf.space
```

---

## 🔧 Post-Deployment: Update Frontend

Update your frontend to use the new backend URL:

**In `src/components/Chatbot.tsx`** (or wherever you call the API):

```typescript
// Oracle Cloud
const API_URL = "http://YOUR_ORACLE_VM_IP:8000";

// Fly.io
const API_URL = "https://your-app.fly.dev";

// Hugging Face
const API_URL = "https://YOUR_USERNAME-portfolio-chatbot.hf.space";
```

---

## 📊 Which Should You Choose?

### Choose **Oracle Cloud** if:
- ✅ You want the BEST free tier (1GB RAM, always on)
- ✅ You're comfortable with Linux/SSH/server management
- ✅ You want production-grade infrastructure
- ✅ You don't mind 30 min setup

### Choose **Fly.io** if:
- ✅ You want **fastest deployment** (5 minutes)
- ✅ You already have fly.toml configured
- ⚠️ BUT: Only 256MB RAM (might struggle with embeddings)

### Choose **Hugging Face** if:
- ✅ You want **best free specs** for AI/ML (2GB RAM)
- ✅ You want free forever
- ✅ You're okay with Docker
- ✅ You want a platform built for AI apps

---

## 🛟 Troubleshooting

### Oracle Cloud: Can't SSH
**Solution:** Check security list ingress rules, ensure port 22 is open

### Oracle Cloud: Can't access port 8000
**Solution:** 
```bash
# Add iptables rule
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```

### Service won't start
```bash
# Check logs
sudo journalctl -u chatbot -f

# Common fixes:
# 1. Wrong working directory in service file
# 2. Missing .env file
# 3. Python path incorrect
```

### Out of memory errors
**Solution:** Your chatbot uses ~800MB RAM with embeddings. Oracle's 1GB should work, but:
- Consider using smaller embedding model
- Or use Hugging Face (2GB RAM)

---

## ✅ Success Checklist

- [ ] VM/Space created and running
- [ ] Code deployed to server
- [ ] Dependencies installed
- [ ] Environment variables set (GROQ_API_KEY)
- [ ] Service running (systemd or container)
- [ ] Firewall configured
- [ ] `/health` endpoint returns 200 OK
- [ ] `/docs` shows API documentation
- [ ] Frontend updated with new URL
- [ ] Chatbot responds to test messages

---

## 🎉 You're Now on Free Cloud Infrastructure!

**Next Steps:**
1. Set up a custom domain (optional)
2. Add HTTPS with Let's Encrypt (for Oracle Cloud)
3. Set up monitoring/logging
4. Create backup script for your knowledge base

---

**Need Help?** Check the platform-specific documentation:
- Oracle Cloud: [docs.oracle.com/iaas](https://docs.oracle.com/iaas)
- Fly.io: [fly.io/docs](https://fly.io/docs)
- Hugging Face: [huggingface.co/docs/hub/spaces](https://huggingface.co/docs/hub/spaces)
