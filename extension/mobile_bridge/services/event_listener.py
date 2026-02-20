import asyncio
from typing import Dict, Any, Callable
from datetime import datetime
from ..models.agent_model import Agent, AgentStatus, AgentEvent
from .agent_registry import AgentRegistry

class EventListener:
    def __init__(self):
        self.registry = AgentRegistry.get_instance()
        self.broadcast_callback = None

    def set_broadcast_callback(self, callback: Callable[[Dict], Any]):
        self.broadcast_callback = callback

    async def _broadcast(self, event: AgentEvent):
        if self.broadcast_callback:
            await self.broadcast_callback(event.model_dump_json())

    # Mock hooks - in a real extension these would be decorated with Antigravity hooks
    async def on_agent_started(self, agent_id: str, name: str, meta: Dict[str, Any] = {}):
        agent = Agent(
            id=agent_id,
            name=name,
            status=AgentStatus.STARTING,
            last_active=datetime.now(),
            meta=meta
        )
        self.registry.update_agent(agent)
        await self._broadcast(AgentEvent(event_type="agent_started", agent_id=agent_id, timestamp=datetime.now(), payload=meta))

    async def on_agent_stopped(self, agent_id: str):
        agent = self.registry.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.STOPPED
            agent.last_active = datetime.now()
            self.registry.update_agent(agent)
            await self._broadcast(AgentEvent(event_type="agent_stopped", agent_id=agent_id, timestamp=datetime.now(), payload={}))

    async def on_task_completed(self, agent_id: str, task_result: Dict[str, Any]):
        agent = self.registry.get_agent(agent_id)
        if agent:
            agent.last_active = datetime.now()
            # Update meta or stats if needed
            self.registry.update_agent(agent)
            await self._broadcast(AgentEvent(event_type="task_completed", agent_id=agent_id, timestamp=datetime.now(), payload=task_result))
    
    async def on_agent_error(self, agent_id: str, error: str):
        agent = self.registry.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.ERROR
            agent.last_active = datetime.now()
            agent.meta["last_error"] = error
            self.registry.update_agent(agent)
            await self._broadcast(AgentEvent(event_type="agent_error", agent_id=agent_id, timestamp=datetime.now(), payload={"error": error}))

    async def on_approval_required(self, agent_id: str, details: str):
        agent = self.registry.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.WAITING_APPROVAL
            agent.last_active = datetime.now()
            self.registry.update_agent(agent)
            await self._broadcast(AgentEvent(event_type="approval_required", agent_id=agent_id, timestamp=datetime.now(), payload={"details": details}))

_event_listener = EventListener()

def get_event_listener():
    return _event_listener
