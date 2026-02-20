import threading
from typing import Dict, List, Optional
from ..models.agent_model import Agent, AgentStatus

class AgentRegistry:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.agents: Dict[str, Agent] = {}

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_all(self) -> List[Agent]:
        with self._lock:
            return list(self.agents.values())

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        with self._lock:
            return self.agents.get(agent_id)

    def update_agent(self, agent: Agent):
        with self._lock:
            self.agents[agent.id] = agent

    def remove_agent(self, agent_id: str):
        with self._lock:
            if agent_id in self.agents:
                del self.agents[agent_id]
