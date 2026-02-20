#!/bin/bash
# Build production release APK for Antone Mobile App

set -e

echo "🏗️  Building Antone Mobile App - Production Release"

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$APP_DIR/release"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'



# Check for production env file
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    echo "Please create .env.production with your production configuration"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies${NC}"
cd "$APP_DIR"
npm install

# Build web assets
echo -e "${YELLOW}Building production web assets${NC}"
npm run build

# Sync with Capacitor
echo -e "${YELLOW}Syncing with Capacitor${NC}"
npx cap sync android

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build release APK
echo -e "${YELLOW}Building release APK${NC}"
cd android
./gradlew assembleRelease --no-daemon

# Copy APK to release directory
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "$OUTPUT_DIR/antone-release.apk"
    echo -e "${GREEN}✅ Release APK built successfully!${NC}"
    echo -e "${GREEN}Location: $OUTPUT_DIR/antone-release-unsigned.apk${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Sign the APK with your keystore"
    echo "2. Align the APK with zipalign"
    echo "3. Test on real devices"
    echo "4. Upload to Google Play Console"
else
    echo -e "${RED}❌ Failed to build release APK${NC}"
    exit 1
fi

# Build debug APK for testing
echo -e "${YELLOW}Building debug APK for testing${NC}"
./gradlew assembleDebug --no-daemon

DEBUG_APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$DEBUG_APK_PATH" ]; then
    cp "$DEBUG_APK_PATH" "$OUTPUT_DIR/antone-debug.apk"
    echo -e "${GREEN}✅ Debug APK also available at: $OUTPUT_DIR/antone-debug.apk${NC}"
fi

echo -e "${GREEN}🎉 Build complete!${NC}"
