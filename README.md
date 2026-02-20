# Antone: Local-First AI Bridge

**Your Mobile Command Center for Local AI Agents.**

Antone bridges the gap between your mobile device and your local development environment. It provides a secure, persistent chat interface to interact with AI agents running on your machine, mirrors your workspace context, and allows for seamless tool execution—all without relying on cloud-based headers or external relays.

## 🚀 Features

-   **Local-First Design**: No data leaves your network unless you configure it.
-   **Persistent Chat**: Agents remember your conversation context.
-   **Workspace Integration**: Bridge directly to your IDE or local backend.
-   **Secure Pairing**: Encrypted token exchange for authorized mobile access.
-   **Extensible**: Python-based backend extension and React/Capacitor mobile app.

## 🛠️ Security Notice

**This project is designed for local network use (LAN/Wi-Fi).**

-   **Transport**: Communications occur over HTTP/WebSocket on Port 8001.
-   **Recommendation**: Run this within a trusted local network. If exposing to the internet, **you must use a reverse proxy (Nginx/Traefik) with SSL/TLS**.
-   **Secrets**: The pairing key is generated locally (`.mobile_bridge_pairing_key`). **Do not commit this file.**

## 🏁 Getting Started

### Prerequisites

-   **Python 3.10+** (Backend)
-   **Node.js 18+** & **Java 21** (Mobile Build)

### 1. Backend Setup (Extension)

```bash
cd extension
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PORT=8001 python -m mobile_bridge
```

*Note the pairing key printed in the logs.*

### 2. Mobile App

You can build the source or install the release APK.

**Option A: Install Release APK**
Transfer `mobile_app/android/app/build/outputs/apk/release/app-release.apk` to your phone.

**Option B: Build from Source**
```bash
cd mobile_app
npm install
npx cap sync android
cd android
./gradlew assembleRelease
```

## 🤝 Contributing

MIT License. Pull requests are welcome!
