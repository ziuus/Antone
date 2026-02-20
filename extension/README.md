# Antone Mobile Bridge Extension

This extension bridges the Antone Mobile App with the Antigravity system, providing AI chat capabilities via Google Gemini.

## Requirements
- Python 3.10+
- Google Gemini API Key

## Setup
1.  Create a virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
2.  Install dependencies:
    ```bash
    pip install -e .
    ```
3.  Add your API Key to `.env` or export it:
    ```bash
    export GEMINI_API_KEY=your_key_here
    ```

## Running Manually (Development)
To run the server locally on port 8001:
```bash
PORT=8001 python3 -m mobile_bridge
```
You will see a **Pairing Key** in the output. Enter this key in the mobile app to connect.

## Running as Service (Production)
For production deployment, use the provided script:
```bash
sudo ./deploy-production.sh
```
This sets up a systemd service `antone-mobilebridge` running on port 8001.

## Accessing Logs
```bash
journalctl -u antone-mobilebridge -f
```
