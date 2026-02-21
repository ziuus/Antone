import os
import secrets
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..config import config

security = HTTPBearer()

class AuthService:
    def __init__(self):
        self.pairing_key = self._load_or_generate_pairing_key()

    def _load_or_generate_pairing_key(self) -> str:
        return secrets.token_urlsafe(16)

    def get_pairing_key(self) -> str:
        return self.pairing_key

    def create_token(self) -> str:
        payload = {
            "sub": "mobile_app",
            "exp": datetime.utcnow() + timedelta(days=365) # Long lived for now
        }
        return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)

    def verify_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

_auth_service = AuthService()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    return _auth_service.verify_token(token)

def get_auth_service():
    return _auth_service
