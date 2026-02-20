from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import List
from ..services.auth import get_auth_service

router = APIRouter()
auth_service = get_auth_service()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Handle disconnected clients gracefully if not caught by disconnect
                pass

manager = ConnectionManager()

@router.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    # Authenticate via query param or header (headers are tricky in WS, often use query param)
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    
    try:
        auth_service.verify_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages if needed (e.g. ping)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def get_connection_manager():
    return manager
