import os
import secrets

class Config:
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8765"))
    JWT_SECRET = os.getenv("MOBILE_BRIDGE_JWT_SECRET", os.getenv("JWT_SECRET", secrets.token_hex(32)))
    JWT_ALGORITHM = "HS256"
    # Use /var/lib/antone for writable runtime data (production), fallback to cwd for dev
    _data_dir = os.getenv("DATA_DIR", os.path.join(os.path.expanduser("~"), ".antone"))
    PAIRING_KEY_FILE = os.path.join(_data_dir, ".mobile_bridge_pairing_key")

config = Config()
