#!/bin/bash
# Oracle Cloud Server Setup Script
# Run this AFTER connecting to your Oracle Cloud VM via SSH

set -e  # Exit on error

echo "🚀 Setting up Portfolio Chatbot Backend on Oracle Cloud..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip git build-essential python3-dev

# Create project directory
echo "📁 Creating project directory..."
mkdir -p ~/chatbot-backend
cd ~/chatbot-backend

# Create virtual environment
echo "🔧 Creating virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Clone repository (you'll need to replace with your repo URL)
echo "📥 Ready to clone your repository"
echo "Run: git clone YOUR_REPO_URL ."
echo ""
echo "Or upload files manually using:"
echo "scp -i your-key.key -r /path/to/backend ubuntu@YOUR_VM_IP:~/chatbot-backend"
echo ""
read -p "Press enter after you've added your code..."

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "📚 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "⚠️  requirements.txt not found!"
    exit 1
fi

# Create .env file
echo "⚙️  Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "GROQ_API_KEY=your_key_here" > .env
    echo "PYTHON_VERSION=3.11.0" >> .env
    echo "📝 Created .env file - EDIT IT WITH YOUR GROQ API KEY!"
    echo "Run: nano .env"
    read -p "Press enter after you've set your API key..."
fi

# Test the application
echo "🧪 Testing application..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
sleep 10
curl -s http://localhost:8000/health || echo "⚠️  Health check failed!"
pkill -f uvicorn

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/chatbot.service > /dev/null <<EOF
[Unit]
Description=Portfolio Chatbot Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/chatbot-backend
Environment="PATH=$HOME/chatbot-backend/venv/bin"
ExecStart=$HOME/chatbot-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "🚀 Starting chatbot service..."
sudo systemctl daemon-reload
sudo systemctl enable chatbot
sudo systemctl start chatbot

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Add iptables rule for port 8000
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save || sudo apt install -y iptables-persistent

# Check service status
echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Service Status:"
sudo systemctl status chatbot --no-pager

echo ""
echo "🌐 Your chatbot is now running!"
echo "Test it at: http://$(curl -s ifconfig.me):8000/health"
echo ""
echo "📝 Useful commands:"
echo "  - Check logs: sudo journalctl -u chatbot -f"
echo "  - Restart service: sudo systemctl restart chatbot"
echo "  - Stop service: sudo systemctl stop chatbot"
echo ""
echo "🎉 Deployment successful!"
