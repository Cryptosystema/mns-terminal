#!/bin/bash
# PHASE 30 FINAL DEPLOYMENT
cd /workspaces/mns-terminal || exit 1

# Build
npm run build || exit 1

# Commit
git add . || exit 1
git commit -m "feat(3d): complete rebuild - tunnel arch with embedded metric peaks" || exit 1

# Push
git push origin main || exit 1

echo "✅✅✅ SUCCESS - PHASE 30 DEPLOYED"
