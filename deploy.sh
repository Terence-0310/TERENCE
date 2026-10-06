#!/bin/bash
# ============================================================
# TERENCE — Deploy / Update Script
# Run: cd /var/www/TERENCE && chmod +x deploy.sh && ./deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/TERENCE"
APP_NAME="terence"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  TERENCE — Deploy Script${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

# ── 1. CD into app ──
cd "$APP_DIR" || { echo -e "${RED}✗ Thư mục $APP_DIR không tồn tại${NC}"; exit 1; }
echo -e "${GREEN}✓${NC} Thư mục: $APP_DIR"

# ── 2. Pull code ──
echo ""
echo "📥 Pulling latest code from $BRANCH..."
git pull origin "$BRANCH" || { echo -e "${RED}✗ Git pull thất bại${NC}"; exit 1; }
echo -e "${GREEN}✓${NC} Code đã cập nhật"

# ── 3. Check .env exists ──
echo ""
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ File .env không tồn tại!${NC}"
    echo "  → Copy từ .env.example:"
    echo "    cp .env.example .env"
    echo "    nano .env"
    echo "  → Nếu đang có .env.local, đổi tên:"
    echo "    mv .env.local .env"
    exit 1
fi
echo -e "${GREEN}✓${NC} File .env tồn tại"

# ── 4. Install dependencies ──
echo ""
echo "📦 Installing dependencies..."
# `npm ci` installs exactly what package-lock.json pins (a plain `npm install`
# can float e.g. livekit-client to a version that breaks the build).
# --legacy-peer-deps matches how the lock file was generated (same as CI/Docker).
npm ci --legacy-peer-deps || { echo -e "${RED}✗ npm ci thất bại${NC}"; exit 1; }
echo -e "${GREEN}✓${NC} Dependencies đã cài xong"

# ── 5. Generate Prisma client ──
echo ""
echo "🗄️  Generating Prisma client..."
npx prisma generate || { echo -e "${RED}✗ Prisma generate thất bại${NC}"; exit 1; }
echo -e "${GREEN}✓${NC} Prisma client generated"

# ── 6. Run migrations ──
echo ""
echo "🗄️  Running Prisma migrations..."
npx prisma migrate deploy || {
    echo "  ⚠️ Migration failed! Check DATABASE_URL in .env"
    echo "  ⚠️ Lỗi P3005 (DB tạo bằng db push, chưa có lịch sử migration) → chạy một lần:"
    echo "     npx prisma migrate resolve --applied 20261006000000_baseline"
    exit 1
}
echo -e "${GREEN}✓${NC} Database ready"

# ── 7. Build ──
echo ""
echo "🏗️  Building production..."
npm run build || {
    echo ""
    echo -e "${RED}════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ BUILD THẤT BẠI — KHÔNG RESTART${NC}"
    echo -e "${RED}  App cũ vẫn đang chạy (nếu có)${NC}"
    echo -e "${RED}════════════════════════════════════${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Build thành công"

# ── 8. Restart / Start PM2 ──
echo ""
echo "♻️  Restarting PM2..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 restart "$APP_NAME"
    echo -e "${GREEN}✓${NC} PM2 process '$APP_NAME' đã restart"
else
    echo "  → Process '$APP_NAME' chưa tồn tại, đang tạo mới..."
    pm2 start ecosystem.config.js
    echo -e "${GREEN}✓${NC} PM2 process '$APP_NAME' đã start"
fi

# ── 9. Save PM2 state ──
pm2 save
echo -e "${GREEN}✓${NC} PM2 state đã lưu"

# ── 10. Summary ──
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ DEPLOY HOÀN TẤT${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "  🌐 https://terence.com.vn"
echo "  📋 pm2 status"
echo "  📋 pm2 logs $APP_NAME --lines 20"
echo "  📋 curl -I http://127.0.0.1:3000"
echo ""
