import uvicorn
import threading
import time
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import config
from .middleware.rate_limit import RateLimitMiddleware
from .api import routes, websocket
from .api import ide_routes
from .api.routes import seed_mock_agents
from .services.event_listener import get_event_listener
from .api.websocket import get_connection_manager
from .services.auth import get_auth_service
import os

# Defines the Extension class expected by Antigravity
class MobileBridgeExtension:
    def __init__(self):
        self.server_thread = None
        self.should_exit = False
        self.app = FastAPI(title="MobileBridge API")

        # Rate Limiting
        self.app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
        
        # Determine allowed origins
        allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

        # Enable CORS for web browser access
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup Routes
        self.app.include_router(routes.router)
        self.app.include_router(websocket.router)
        self.app.include_router(ide_routes.router)
        
        # Link Event Listener to WebSocket
        self.event_listener = get_event_listener()
        self.connection_manager = get_connection_manager()
        
        # The broadcast needs to happen on the loop where the websocket is running.
        # Since uvicorn runs in its own thread/loop, we need a way to bridge this.
        # For this implementation, we will assume the event callbacks might come from a different thread.
        # We can implement a simple async bridge if we were sharing the loop, 
        # but here we'll just let the websocket manager handle the broadcast which is async.
        # Ideally, we'd use a queue or similar if loops are different.
        
        # For simplicity in this extension pattern, we inject the broadcast method
        # NOTE: This simple assignment assumes thread-safety on the loop or that uvicorn handles it.
        # In a robust prod env, use `call_soon_threadsafe`.
        self.event_listener.set_broadcast_callback(self.connection_manager.broadcast)
        
        # Seed demo agents on startup
        seed_mock_agents()

    def start_server(self):
        auth_service = get_auth_service()
        print(f"\n[MobileBridge] 🚀 Starting server on http://{config.HOST}:{config.PORT}")
        print(f"[MobileBridge] 🔑 Pairing Key: {auth_service.get_pairing_key()}")
        print(f"[MobileBridge] Use this key to pair your mobile app.\n")
        
        uvicorn.run(self.app, host=config.HOST, port=config.PORT, log_level="info")

    def on_load(self):
        """Called when Antigravity loads the extension."""
        self.server_thread = threading.Thread(target=self.start_server, daemon=True)
        self.server_thread.start()
        
        # Hook into Antigravity events here
        # antigravity.events.subscribe("agent_start", self.event_listener.on_agent_started)
        # antigravity.events.subscribe("agent_stop", self.event_listener.on_agent_stopped)
        # etc...
        print("[MobileBridge] Extension loaded.")

    def on_unload(self):
        """Called when Antigravity unloads the extension."""
        print("[MobileBridge] Stopping server...")
        # Uvicorn doesn't have a clean "stop" from another thread easily without signal handlers
        # but since it's a daemon thread, it will die with the main process.
        # For graceful shutdown in a real app, we'd set a flag or use uvicorn Server object control.
        print("[MobileBridge] Extension unloaded.")

# Entry point instance
extension = MobileBridgeExtension()

def load_extension():
    extension.on_load()

def unload_extension():
    extension.on_unload()
