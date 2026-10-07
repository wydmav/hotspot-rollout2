#!/bin/bash
# ==============================================================================
# T-Connect Lesotho - One-Liner Contabo VPS Deployment & Bootstrap Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (x86_64 or ARM64)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}   T-CONNECT LESOTHO: CONTABO VPS AUTOMATED DEPLOYMENT ENGINE   ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# 1. Root Privileges Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please execute this script as root or via sudo:${NC}"
  echo "sudo bash deploy-vps.sh"
  exit 1
fi

APP_DIR="/opt/tconnect"
REPO_URL="https://github.com/wydmav/tconnect.git"

echo -e "${YELLOW}[1/6] Updating OS packages and installing essential tools...${NC}"
apt-get update -qq
apt-get install -y -qq curl wget git ufw wireguard iptables ca-certificates gnupg lsb-release

# 2. Install Docker & Docker Compose if not present
echo -e "${YELLOW}[2/6] Verifying Docker Engine installation...${NC}"
if ! command -v docker &> /dev/null; then
  echo "Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo -e "${GREEN}Docker is already installed ($(docker --version))${NC}"
fi

# 3. Setup Project Directory & Source Code
echo -e "${YELLOW}[3/6] Setting up application directory at ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "Existing Git repository detected. Pulling latest updates..."
  git pull origin main || true
else
  echo "Cloning fresh repository from GitHub..."
  git clone "$REPO_URL" "$APP_DIR" || {
    echo -e "${YELLOW}[NOTE] If your repository is private or not yet uploaded, use the manual transfer command:${NC}"
    echo "scp -r ./* root@$(curl -s ifconfig.me):/opt/tconnect/"
  }
fi

# 4. Environment Configuration
echo -e "${YELLOW}[4/6] Configuring Production Environment (.env)...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "$APP_DIR/.env.example" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  else
    cat << 'EOF' > "$APP_DIR/.env"
NODE_ENV=production
PORT=3000
VITE_CONTROLLER_DOMAIN=app.tconnect.co.ls
VITE_CURRENCY=M
WIREGUARD_SUBNET=10.99.0.0/16
RADIUS_SECRET=tconnect_radius_super_secret_2026
EOF
  fi
  echo -e "${GREEN}Created ${APP_DIR}/.env configuration file.${NC}"
else
  echo -e "${GREEN}.env file already exists.${NC}"
fi

# 5. Configure Firewall (UFW)
echo -e "${YELLOW}[5/6] Securing Host Firewall (UFW)...${NC}"
ufw allow 22/tcp comment 'SSH' || true
ufw allow 80/tcp comment 'HTTP Caddy' || true
ufw allow 443/tcp comment 'HTTPS Caddy' || true
ufw allow 51820/udp comment 'WireGuard VPN' || true
ufw allow 1812/udp comment 'FreeRADIUS Auth' || true
ufw allow 1813/udp comment 'FreeRADIUS Acct' || true
ufw --force enable || true

# 6. Build & Launch Platform Containers
echo -e "${YELLOW}[6/6] Building & launching Docker containers (Caddy, Node.js, FreeRADIUS)...${NC}"
cd "$APP_DIR"
docker compose down || true
docker compose up -d --build

PUBLIC_IP=$(curl -s -4 ifconfig.me || echo "YOUR_VPS_IP")

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}   T-CONNECT PLATFORM IS ONLINE AND OPERATIONAL!               ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "Access your Controller at:      ${CYAN}http://${PUBLIC_IP}:3000${NC}"
echo -e "Or via your domain:             ${CYAN}https://app.tconnect.co.ls${NC} (Once DNS points to ${PUBLIC_IP})"
echo ""
echo -e "Helpful Operations Commands:"
echo -e "  View application logs:         ${YELLOW}docker compose logs -f app${NC}"
echo -e "  View reverse proxy SSL logs:   ${YELLOW}docker compose logs -f caddy${NC}"
echo -e "  Restart all services:          ${YELLOW}docker compose restart${NC}"
echo -e "  Pull latest code & rebuild:    ${YELLOW}git pull && docker compose up -d --build${NC}"
echo ""
