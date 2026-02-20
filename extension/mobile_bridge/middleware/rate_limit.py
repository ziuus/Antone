import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict, deque

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.limit = requests_per_minute
        # Dict to store request timestamps per IP
        # Value is a deque of timestamps
        self.request_history = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        # Allow health checks and websocket upgrades without rate limiting for now
        if request.url.path == "/health" or request.url.path == "/ws":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean up old timestamps
        history = self.request_history[client_ip]
        while history and history[0] < now - 60:
            history.popleft()

        if len(history) >= self.limit:
            return Response("Too Many Requests", status_code=429)

        history.append(now)
        
        # Process request
        response = await call_next(request)
        return response
