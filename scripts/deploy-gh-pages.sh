#!/bin/bash
# PokerGTO — Deploy web app + landing page to GitHub Pages
# Usage: bash deploy-gh-pages.sh
set -e

echo "🚀 Deploying PokerGTO to GitHub Pages..."

# Ensure we're in the project root
cd /Users/blackmamba/poker-gto-trainer

# Build the web app
echo "📦 Building web app..."
npx vite build --config vite.config.web.mts

# Create worktree for gh-pages
echo "📂 Preparing gh-pages branch..."
WORKTREE=$(mktemp -d /tmp/pokergto-deploy-XXXXXX)
git worktree add "$WORKTREE" gh-pages

# Clean trap
cleanup() {
  echo "🧹 Cleaning up..."
  cd /Users/blackmamba/poker-gto-trainer
  git worktree remove "$WORKTREE" --force 2>/dev/null || true
}
trap cleanup EXIT

# Copy landing page to root
echo "📄 Copying landing page..."
cp deploy/index.html "$WORKTREE/index.html"
cp deploy/privacy.html "$WORKTREE/privacy.html" 2>/dev/null || true
cp deploy/terms.html "$WORKTREE/terms.html" 2>/dev/null || true

# Copy web app to app/
echo "🌐 Copying web app..."
rm -rf "$WORKTREE/app/"*
cp -r dist/web/* "$WORKTREE/app/"

# Copy payment QR codes
mkdir -p "$WORKTREE/app/payment"
cp -r deploy/payment/* "$WORKTREE/app/payment/" 2>/dev/null || true

# Commit and push
cd "$WORKTREE"
echo "📝 Committing..."
git add -A
git commit -m "deploy: web app with live CFR solver + updated landing page

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "📤 Pushing to origin/gh-pages..."
git push origin gh-pages

echo "✅ Deployed! Live at:"
echo "   Landing: https://wei-d-web.github.io/poker-gto-trainer/"
echo "   Web App: https://wei-d-web.github.io/poker-gto-trainer/app/"
