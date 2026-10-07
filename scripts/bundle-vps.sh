#!/bin/bash
# ==============================================================================
# T-Connect Production Packaging Script for VPS Deployment & GitHub Release
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  T-CONNECT: PRODUCTION VPS BUNDLER & GITHUB COMMIT ENGINE       ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Build Production Frontend Bundle
echo -e "${YELLOW}[1/4] Building production frontend distribution (Vite)...${NC}"
npm run build

# 2. Verify Output Artifacts
if [ ! -d "dist" ]; then
  echo -e "\033[0;31m[ERROR] Build directory 'dist' was not created. Aborting.\033[0m"
  exit 1
fi

# 3. Create Clean Production Tarball
ARCHIVE_NAME="tconnect-production-vps.tar.gz"
echo -e "${YELLOW}[2/4] Packaging self-contained VPS release: ${ARCHIVE_NAME}...${NC}"

tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./.aistudio' \
    --exclude='./*.tar.gz' \
    --exclude='./coverage' \
    --exclude='./.DS_Store' \
    -czf "$ARCHIVE_NAME" .

ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo -e "${GREEN}[OK] Production archive created: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})${NC}"

# 4. Prepare Git Commit
echo -e "${YELLOW}[3/4] Ensuring Git repository is committed and clean...${NC}"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
  git branch -M main
fi

git add -A
git commit -m "feat: complete T-Connect cloud controller with captive portal builders, Lesotho gateways, and MikroTik adoption" || echo "Working tree clean, nothing new to commit."

# 5. Instructions
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  BUNDLE READY FOR VPS UPLOAD & GITHUB REPO SYNC!               ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "A. To push code to your GitHub repository:"
echo -e "   ${CYAN}git remote add origin https://github.com/YOUR_USERNAME/tconnect.git${NC}"
echo -e "   ${CYAN}git push -u origin main${NC}"
echo ""
echo -e "B. To upload the production archive directly to your VPS:"
echo -e "   ${CYAN}scp ${ARCHIVE_NAME} root@YOUR_VPS_IP:/opt/${NC}"
echo ""
echo -e "C. On the VPS (SSH terminal):"
echo -e "   ${CYAN}ssh root@YOUR_VPS_IP${NC}"
echo -e "   ${CYAN}mkdir -p /opt/tconnect && tar -xzf /opt/${ARCHIVE_NAME} -C /opt/tconnect${NC}"
echo -e "   ${CYAN}cd /opt/tconnect${NC}"
echo -e "   ${CYAN}cp .env.production.example .env${NC}"
echo -e "   ${CYAN}docker compose up -d --build${NC}"
echo ""
