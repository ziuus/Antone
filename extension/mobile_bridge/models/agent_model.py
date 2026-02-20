from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime

class AgentStatus(str, Enum):
    STARTING = "starting"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"
    WAITING_APPROVAL = "waiting_approval"

class Agent(BaseModel):
    id: str
    name: str
    status: AgentStatus
    last_active: datetime
    current_task: Optional[str] = None
    workspace: Optional[str] = None
    meta: Dict[str, Any] = {}

class AgentEvent(BaseModel):
    event_type: str
    agent_id: str
    timestamp: datetime
    payload: Dict[str, Any]

class ApiResponse(BaseModel):
    status: str
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class PlaygroundRequest(BaseModel):
    model: str
    system_prompt: Optional[str] = ""
    user_prompt: str
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
