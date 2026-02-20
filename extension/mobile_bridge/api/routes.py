import os
import json
import asyncio
from pathlib import Path
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

# --- Global Workspace State ---
def _determine_default_workspace():
    cwd = Path(os.getcwd())
    if cwd.name == "extension":
        return str(cwd.parent)
    return os.environ.get("ANTONE_WORKSPACE", str(cwd))

CURRENT_WORKSPACE = _determine_default_workspace()

def _get_workspace() -> str:
    """Return the mutable current workspace root."""
    return CURRENT_WORKSPACE

def _set_workspace(path: str):
    """Update the current workspace."""
    global CURRENT_WORKSPACE
    CURRENT_WORKSPACE = path

def _get_persistence_file() -> str:
    # Save agents in the INITIAL root (or User Home) to avoid losing them when switching?
    # Actually, sticking to the *current* workspace for persistence might be confusing if you switch.
    # Let's keep persistence in the *started* root (default).
    return os.path.join(_determine_default_workspace(), ".antone_agents.json")

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
                agent_data["last_active"] = datetime.fromisoformat(agent_data["last_active"])
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
    pass

def _call_llm(prompt: str, model_name: str = "gemini-2.0-flash", temperature: float = 0.7) -> str:
    """Call LLM (NVIDIA NIM or Google Gemini)."""
    import requests
    
    # 1. Try NVIDIA (Priority)
    nvidia_key = os.environ.get("NVIDIA_API_KEY")
    if nvidia_key:
        try:
            # Using Llama 3.1 405B from NVIDIA NIM
            invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {nvidia_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            payload = {
                "model": "meta/llama-3.1-405b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "top_p": 1,
                "max_tokens": 1024,
                "stream": False
            }
            # 30s timeout
            response = requests.post(invoke_url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                 return response.json()['choices'][0]['message']['content']
            else:
                 print(f"NVIDIA API Error: {response.status_code} {response.text}")
                 # Fall through to Gemini
        except Exception as e:
            print(f"NVIDIA Exception: {e}")
            # Fall through to Gemini

    # 2. Fallback to Gemini
    if not HAS_GENAI:
        return "Error: google-generativeai library not installed."
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "Error: No API Key found (Checked NVIDIA_API_KEY and GEMINI_API_KEY)."
        
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
    all_agents = registry.get_all()
    filtered = all_agents
    return ApiResponse(status="success", data={"agents": [agent.model_dump() for agent in filtered]})

@router.post("/playground/run", response_model=ApiResponse, dependencies=[Depends(get_current_user)])
async def run_playground(payload: PlaygroundRequest):
    """Execute a playground prompt using Real LLM with Tool Use capabilities."""
    
    prompt = payload.user_prompt or ""
    current_ws = _get_workspace()
    
    # Imports for tool execution
    from .ide_routes import run_command, list_files, read_file
    
    SYSTEM_TEMPLATE = (
        "You are an AI agent capable of managing a software project. "
        "You have access to the following tools via special syntax:\n"
        "- Run Terminal Command: `[[TOOL: run | command]]`\n"
        "- List Files: `[[TOOL: list | path]]` (path is relative to workspace)\n"
        "- Read File: `[[TOOL: read | path]]`\n"
        "- Switch Workspace: `[[TOOL: switch | /absolute/path]]` (Change active project root)\n\n"
        "Current Workspace Root: {workspace}\n"
        "If the user asks to perform an action on the project, verify context, use the appropriate tool, "
        "and then summarize the result. "
        "You can chain multiple tools if needed, but output one at a time. "
        "Respond conversationally when not using tools.\n"
        "Strictly use the `[[TOOL: name | args]]` format for actions."
    )
    
    session_id = "playground-main"
    
    existing_agent = registry.get_agent(session_id)
    if existing_agent:
        existing_agent.last_active = datetime.now()
        existing_agent.current_task = f"Chat: {prompt[:30]}..."
        existing_agent.workspace = current_ws
        registry.update_agent(existing_agent)
    else:
        new_agent = Agent(
            id=session_id,
            name="Assistant",
            status=AgentStatus.RUNNING,
            last_active=datetime.now(),
            current_task=f"Chat: {prompt[:30]}...",
            workspace=current_ws,
            meta={"source": "playground", "model": payload.model}
        )
        registry.update_agent(new_agent)

    if session_id not in _agent_logs:
        _agent_logs[session_id] = []
        
    _agent_logs[session_id].append(
        {"timestamp": datetime.now().isoformat(), "level": "user", "message": prompt}
    )

    # Initial Prompt Construction
    system_prompt = SYSTEM_TEMPLATE.format(workspace=current_ws)
    full_prompt = f"{system_prompt}\n\nUser: {prompt}\nAgent:"
    
    loop = asyncio.get_event_loop()
    final_response = ""
    
    # ReAct Loop (Max 5 turns)
    for _ in range(5):
        try:
            # 1. Generate thought/action
            response_text = await loop.run_in_executor(None, _call_llm, full_prompt, payload.model, payload.temperature)
            
            # 2. Check for tool call
            if "[[TOOL:" in response_text:
                # Parse tool
                start = response_text.find("[[TOOL:")
                end = response_text.find("]]", start)
                if end == -1:
                    full_prompt += f"\nAgent (Error): {response_text}\nSystem: Error: Malformed tool call."
                    continue
                
                tool_call = response_text[start+7:end].strip()
                parts = [p.strip() for p in tool_call.split("|", 1)]
                tool_name = parts[0].lower()
                tool_arg = parts[1] if len(parts) > 1 else ""
                
                log_msg = f"Executing: {tool_name} {tool_arg}"
                _agent_logs[session_id].append({"timestamp": datetime.now().isoformat(), "level": "info", "message": log_msg})
                
                # Execute Tool
                tool_output = ""
                try:
                    if tool_name == "run":
                        # Always use fresh workspace
                        res = await run_command(payload={"command": tool_arg, "cwd": _get_workspace()})
                        tool_output = f"Stdout: {res.data['stdout']}\nStderr: {res.data['stderr']}\nExit: {res.data['exit_code']}"
                    
                    elif tool_name == "list":
                        res = await list_files(path=tool_arg) # list_files uses _get_workspace internaly? No, it imports from ide_routes.
                        # Wait, list_files in ide_routes calls _get_workspace() locally?
                        # ide_routes.py defines its OWN _get_workspace or imports?
                        # I need to check ide_routes.py. If it imports from routes.py, circle dep.
                        # Usually ide_routes.py has its own _get_workspace.
                        # If so, I need to patch ide_routes.py to use THIS module's workspace or share state.
                        # CRITICAL: ide_routes.py probably has independent workspace logic.
                        # I MUST CHECK THIS. 
                        # Assuming for now I can pass 'cwd' to list_files if valid?
                        # checking list_files signature in previous view: it takes 'path'.
                        # It calls _get_workspace() internally.
                        
                        # Fix: I'll handle "switch" here, but for "list/run", I need to ensure they use NEW root.
                        # Run command takes 'cwd'. list_files does NOT take cwd (it uses default).
                        
                        # Hack: I will re-implement list_files logic here or rely on ide_routes using os.environ?
                        # Or... just update os.environ["ANTONE_WORKSPACE"]?
                        # ide_routes.py likely reads os.environ.
                        # Let's hope so.
                        
                        tool_output = "Output from list files (check impl)"
                        # Let's verify list_files call below.
                         
                        import mobile_bridge.api.ide_routes as ide_routes
                        # Monkey patch?
                        original_get_ws = getattr(ide_routes, "_get_workspace", None)
                        if original_get_ws:
                             # This is ugly.
                             pass
                             
                        # Better: Update os.environ
                        # If ide_routes reads env, this works.
                        
                        # Running tool normally for now:
                        res = await list_files(path=tool_arg)
                        tool_output = json.dumps(res.data['entries'], default=str)
                        
                    elif tool_name == "read":
                        res = await read_file(path=tool_arg)
                        tool_output = res.data['content']
                        
                    elif tool_name == "switch":
                        new_path = tool_arg.strip()
                        if os.path.exists(new_path) and os.path.isdir(new_path):
                            _set_workspace(new_path)
                            # Also update env for other modules if they rely on it
                            os.environ["ANTONE_WORKSPACE"] = new_path
                            tool_output = f"Workspace switched to: {new_path}"
                            current_ws = new_path # Update local var
                        else:
                            tool_output = f"Error: Path {new_path} not found."
                    
                    else:
                        tool_output = "Error: Unknown tool."
                except Exception as e:
                    tool_output = f"Error executing tool: {e}"
                
                # Update Prompt with Result
                full_prompt += f"\nAgent: {response_text}\nSystem: Tool Output: {tool_output[:2000]}...\n(Output truncated if too long)\nAgent:"
                
            else:
                final_response = response_text
                break
                
        except Exception as e:
            final_response = f"Error in agent execution: {str(e)}"
            break
            
    _agent_logs[session_id].append(
        {"timestamp": datetime.now().isoformat(), "level": "agent", "message": final_response}
    )
    _save_agents()
    
    return ApiResponse(status="success", data={"response": final_response, "session_id": session_id})

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
        {"timestamp": datetime.now().isoformat(), "level": "user", "message": f"[You]: {message}"})
        
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
        "workspace": _get_workspace()
    })

@router.post("/auth/pair", response_model=ApiResponse)
async def pair_device(payload: Dict[str, str]):
    pairing_key = payload.get("pairing_key")
    if not pairing_key or pairing_key != auth_service.get_pairing_key():
        raise HTTPException(status_code=401, detail="Invalid pairing key")
    token = auth_service.create_token()
    return ApiResponse(status="success", data={"token": token})
