# 📱 Antone

> **Agentic Mobile Command Center — Bridging your local workspace intelligence to your palms with zero-latency synchronization.**

Antone is a high-performance, local-first bridge that transforms your mobile device into a powerful extension of your engineering environment. It allows you to interact with local AI agents, execute workspace tools, and monitor complex system states from anywhere within your network, effectively putting your "IDE in your palms."

## ⚡ Core Features

- **Workspace Intelligence Bridge**: Real-time synchronization between your local development context and mobile interface.
- **Local-First Security**: Peer-to-peer communication over local infrastructure—your data never touches external relays.
- **Secure Pairing Protocol**: High-entropy token exchange for authorized mobile-to-desktop access.
- **Agentic Tool Execution**: Remotely trigger build scripts, tests, and agentic workflows directly from the Antone mobile app.
- **Cross-Platform Mobility**: Built with **React Native / Capacitor** for fluid, native performance on Android and iOS.

## 🛠 Tech Stack

- **Backend**: Python 3.10+ (FastAPI / WebSockets)
- **Mobile**: React + Capacitor + Tailwind CSS
- **Intelligence**: Integrated with local LLM providers and the **Gemini CLI** ecosystem.
- **Security**: Local network encryption + persistent pairing keys.

## 🚀 Getting Started

### 1. Backend Synchronization
```bash
cd extension
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PORT=8001 python -m mobile_bridge
```

### 2. Mobile Deployment
Transfer the latest APK from the `releases/` directory or build from source:
```bash
cd mobile_app
npm install && npx cap sync android
```

## 📂 Project Structure

- `extension/`: Python-based mobile bridge and workspace connector.
- `mobile_app/`: High-fidelity React frontend for mobile interaction.
- `releases/`: Production-ready binaries for instant deployment.

---
*Antone: Engineering Without Boundaries.*
