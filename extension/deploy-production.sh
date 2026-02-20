#!/bin/bash
# Production Deployment Script for Antone MobileBridge Extension

set -e

echo "🚀 Starting Antone MobileBridge Production Deployment"

# Configuration
APP_DIR="/opt/antone"
SERVICE_NAME="antone-mobilebridge"
VENV_DIR="$APP_DIR/.venv"
LOG_DIR="/var/log/antone"
USER="antone"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Create user if doesn't exist
if ! id "$USER" &>/dev/null; then
    echo -e "${YELLOW}Creating user $USER${NC}"
    useradd -r -s /bin/false $USER
fi

# Create directories
echo -e "${YELLOW}Creating directories${NC}"
mkdir -p $APP_DIR
mkdir -p $LOG_DIR
chown -R $USER:$USER $LOG_DIR

# Copy files
echo -e "${YELLOW}Copying application files${NC}"
cp -r extension/* $APP_DIR/
chown -R $USER:$USER $APP_DIR

# Setup virtual environment
echo -e "${YELLOW}Setting up Python virtual environment${NC}"
cd $APP_DIR
python3 -m venv $VENV_DIR
source $VENV_DIR/bin/activate
pip install --upgrade pip
pip install -e .

# Check for production env file
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    echo "Please create $APP_DIR/.env.production from .env.production.template"
    exit 1
fi

# Create systemd service
echo -e "${YELLOW}Creating systemd service${NC}"
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Antone MobileBridge Extension
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
EnvironmentFile=$APP_DIR/.env.production
ExecStart=$VENV_DIR/bin/python -m mobile_bridge
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable and start service
echo -e "${YELLOW}Enabling and starting service${NC}"
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# Check status
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}Service is running${NC}"
    systemctl status $SERVICE_NAME --no-pager
else
    echo -e "${RED}❌ Service failed to start${NC}"
    journalctl -u $SERVICE_NAME -n 50 --no-pager
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo "View logs: journalctl -u $SERVICE_NAME -f"
echo "Stop service: systemctl stop $SERVICE_NAME"
echo "Restart service: systemctl restart $SERVICE_NAME"
