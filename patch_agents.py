import os
import subprocess
import sys

# Configuration
APP_DIR = "/opt/antone"
VENV_PYTHON = os.path.join(APP_DIR, ".venv/bin/python")
VENV_PIP = os.path.join(APP_DIR, ".venv/bin/pip")
ROUTES_FILE = os.path.join(APP_DIR, "mobile_bridge/api/routes.py")

NEW_ROUTES_CONTENT = r'''import os
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..services.auth import get_current_user, get_auth_service
from ..services.agent_registry import AgentRegistry
from ..models.agent_model import ApiResponse, Agent, AgentStatus, PlaygroundRequest
from ..services.event_listener import get_event_listener

# Try import google generative AI
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

router = APIRouter()
registry = AgentRegistry.get_instance()
event_listener = get_event_listener()
auth_service = get_auth_service()

# In-memory log store per agent (will be persisted)
_agent_logs: Dict[str, List[Dict]] = {}

def _get_workspace() -> str:
    """Return the workspace root. Defaults to HOME."""
    return os.environ.get("ANTONE_WORKSPACE", os.path.expanduser("~"))

def _get_persistence_file() -> str:
    return os.path.join(_get_workspace(), ".antone_agents.json")

def _load_agents():
    """Load agents and logs from disk."""
    path = _get_persistence_file()
    if not os.path.exists(path):
        return
    
    try:
        with open(path, "r") as f:
            data = json.load(f)
            
        # Restore agents
        for agent_data in data.get("agents", []):
            if agent_data.get("last_active"):
                try:
                    agent_data["last_active"] = datetime.fromisoformat(agent_data["last_active"])
                except:
                    pass
            agent = Agent(**agent_data)
            registry.update_agent(agent)
            
        # Restore logs
        global _agent_logs
        _agent_logs = data.get("logs", {})
        print(f"Loaded {len(_agent_logs)} log entries from {path}")
    except Exception as e:
        print(f"Error loading agents: {e}")

def _save_agents():
    """Save agents and logs to disk."""
    path = _get_persistence_file()
    data = {
        "agents": [a.model_dump(mode='json') for a in registry.get_all()],
        "logs": _agent_logs
    }
    try:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"Error saving agents: {e}")

# Initial load
_load_agents()

def seed_mock_agents():
    """Seed demo agents ONLY if registry is empty."""
    current_ws = _get_workspace()
    all_agents = registry.get_all()
    
    # If we have ANY agents for this workspace, don't seed
    existing = [a for a in all_agents if a.workspace == current_ws]
    if existing:
        return

    # Seed initial agents
    mock_agents = [
        Agent(id=f"agent-research-{os.urandom(2).hex()}", name="Research Agent", status=AgentStatus.RUNNING,
              last_active=datetime.now(), current_task="Summarizing arxiv papers on LLMs",
              workspace=current_ws,
              meta={"model": "gemini-2.0-flash", "tasks_completed": 42}),
        Agent(id=f"agent-code-{os.urandom(2).hex()}", name="Code Assistant", status=AgentStatus.WAITING_APPROVAL,
              last_active=datetime.now(), current_task="Refactor auth module — awaiting approval",
              workspace=current_ws,
              meta={"model": "gemini-2.0-flash", "tasks_completed": 17}),
    ]
    for agent in mock_agents:
        registry.update_agent(agent)
        _agent_logs[agent.id] = [
            {"timestamp": datetime.now().isoformat(), "level": "info",
                "message": f"Agent '{agent.name}' initialized in {current_ws}."},
        ]
    _save_agents()

def _call_llm(prompt: str, model_name: str = "gemini-2.0-flash", temperature: float = 0.7) -> str:
    """Call Google Gemini API."""
    if not HAS_GENAI:
        return "Error: google-generativeai library not installed."
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "Error: GEMINI_API_KEY environment variable not set."
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )
        return response.text
    except Exception as e:
        return f"Error calling LLM: {str(e)}"

@router.get("/health", response_model=ApiResponse)
async def health_check():
    return ApiResponse(status="success", message="MobileBridge is running")

@router.get("/agents", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def get_agents(all: bool = True):
    seed_mock_agents()
    
    current_ws = _get_workspace()
    all_agents = registry.get_all()
    
    if not all:
        filtered = [a for a in all_agents if a.workspace == current_ws or a.workspace is None]
    else:
        filtered = all_agents
        
    return ApiResponse(status="success", data={"agents": [agent.model_dump() for agent in filtered]})

@router.post("/playground/run", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def run_playground(payload: PlaygroundRequest):
    """Execute a playground prompt using Real LLM and save session."""
    
    prompt = payload.user_prompt or ""
    
    # Call Real LLM
    loop = asyncio.get_event_loop()
    response_text = await loop.run_in_executor(None, _call_llm, prompt, payload.model, payload.temperature)
    
    # Persist as a new Agent/Chat session
    session_id = f"playground-{os.urandom(4).hex()}"
    new_agent = Agent(
        id=session_id,
        name=f"Chat {datetime.now().strftime('%H:%M')}: {prompt[:20]}...",
        status=AgentStatus.STOPPED,
        last_active=datetime.now(),
        current_task=f"Chat: {prompt[:30]}...",
        workspace=_get_workspace(),
        meta={"source": "playground", "model": payload.model}
    )
    registry.update_agent(new_agent)
    
    # Save logs
    _agent_logs[session_id] = [
        {"timestamp": datetime.now().isoformat(), "level": "user", "message": prompt},
        {"timestamp": datetime.now().isoformat(), "level": "agent", "message": response_text}
    ]
    _save_agents()
    
    return ApiResponse(status="success", data={"response": response_text, "session_id": session_id})

@router.post("/agents/{agent_id}/approve", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def approve_agent(agent_id: str):
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.status = AgentStatus.RUNNING
    agent.last_active = datetime.now()
    agent.current_task = agent.current_task.replace("— awaiting approval", "").strip() if agent.current_task else None
    
    registry.update_agent(agent)
    
    _agent_logs.setdefault(agent_id, []).append(
        {"timestamp": datetime.now().isoformat(), "level": "info", "message": "Task approved. Agent resumed."})
    
    _save_agents()
    return ApiResponse(status="success", message=f"Approval sent for agent {agent_id}")

@router.post("/agents/{agent_id}/message", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def send_message(agent_id: str, payload: Dict[str, str]):
    agent = registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    message = payload.get("message", "")
    
    _agent_logs.setdefault(agent_id, []).append(
        {"timestamp": datetime.now().isoformat(), "level": "user", "message": f"You: {message}"})
        
    # Generate Agent Response (Real LLM)
    system_prompt = f"You are an AI agent named '{agent.name}'. Your current task is '{agent.current_task}'. status: {agent.status}. Respond to the user."
    full_prompt = f"{system_prompt}\n\nUser: {message}\nAgent:"
    
    loop = asyncio.get_event_loop()
    response_text = await loop.run_in_executor(None, _call_llm, full_prompt)
    
    _agent_logs[agent_id].append(
        {"timestamp": datetime.now().isoformat(), "level": "agent", "message": response_text})
        
    _save_agents()
    return ApiResponse(status="success", message="Message delivered to agent")

@router.get("/system/status", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def system_status():
    all_agents = registry.get_all()
    running = sum(1 for a in all_agents if a.status == AgentStatus.RUNNING)
    waiting = sum(1 for a in all_agents if a.status == AgentStatus.WAITING_APPROVAL)
    return ApiResponse(status="success", data={
        "uptime": "running",
        "active_agents": running,
        "waiting_approval": waiting,
        "total_agents": len(all_agents),
    })

@router.post("/auth/pair", response_model=ApiResponse)
async def pair_device(payload: Dict[str, str]):
    pairing_key = payload.get("pairing_key")
    if not pairing_key or pairing_key != auth_service.get_pairing_key():
        raise HTTPException(status_code=401, detail="Invalid pairing key")
    token = auth_service.create_token()
    return ApiResponse(status="success", data={"token": token})
'''

def run(cmd):
    print(f"Running: {cmd}")
    subprocess.check_call(cmd, shell=True, executable='/bin/bash')

def main():
    if os.geteuid() != 0:
        print("Please run as root (sudo)")
        sys.exit(1)

    print("--- Patching Antone MobileBridge for Real LLM Support & Persistence ---")
    
    if not os.path.exists(APP_DIR):
        print(f"Error: {APP_DIR} does not exist. Is the backend installed?")
        sys.exit(1)

    # 1. Install dependency
    print("Installing google-generativeai...")
    try:
        run(f"{VENV_PIP} install google-generativeai")
    except Exception as e:
        print(f"Warning: Failed to install dependency: {e}")

    # 2. Update routes.py
    print(f"Updating {ROUTES_FILE}...")
    try:
        with open(ROUTES_FILE, "w") as f:
            f.write(NEW_ROUTES_CONTENT)
    except Exception as e:
        print(f"Error writing file: {e}")

    # 3. Restart Service
    print("Restarting service...")
    try:
        run("systemctl restart antone-mobilebridge")
    except:
        print("Warning: Failed to restart service. Is it running?")

    print("--- Done! ---")
    print("IMPORTANT: Add GEMINI_API_KEY=your_key to /opt/antone/.env.production")

if __name__ == "__main__":
    main()
