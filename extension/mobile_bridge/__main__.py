"""
Standalone entry point for running MobileBridge as a production service.
Usage: python -m mobile_bridge
"""
import os
import sys
from pathlib import Path

# Load .env manually
try:
    env_path = Path(__file__).parent.parent.parent / ".env"
    if not env_path.exists():
         env_path = Path(__file__).parent.parent / ".env"

    if env_path.exists():
        print(f"Loading .env from {env_path}")
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    try:
                        k, v = line.split("=", 1)
                        os.environ[k] = v
                    except ValueError:
                        pass
except Exception as e:
    print(f"Error loading .env: {e}")

from mobile_bridge.extension_entry import extension

if __name__ == "__main__":
    extension.start_server()
