from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class Purpose(BaseModel):
    seed: str
    description: str
    updated_at: datetime


class Module(BaseModel):
    name: str
    description: str
    category: str
    status: str = "online"


class Agent(BaseModel):
    id: str
    name: str
    role: str
    purpose: Purpose
    modules: List[Module]


class A2AMessage(BaseModel):
    sender: str
    receiver: str
    intent: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ActionLog(BaseModel):
    message: A2AMessage
    accepted: bool
    reason: Optional[str] = None


app = FastAPI(title="ATAI Leo AI v3.5", version="0.1.0")


# Demo in-memory state to keep the sample lightweight.
PURPOSE_SEED = Purpose(
    seed="Optimizar y monitorizar sistemas críticos con autonomía alineada a principios",
    description=(
        "CORTEX opera como agente central que coordina módulos MCP, mantiene coherencia con"
        " metas y supervisa oportunidades para actuar de forma proactiva."
    ),
    updated_at=datetime.utcnow(),
)

MODULES = [
    Module(
        name="CORTEX LLM",
        description="Centro de razonamiento consciente y única interfaz hacia el exterior.",
        category="Cognitivo",
    ),
    Module(
        name="Purpose Engine",
        description="Evalúa alineación con propósito y detecta oportunidades proactivas.",
        category="Alineación",
    ),
    Module(
        name="Self-Reflector",
        description="Metacognición y coherencia interna del yo digital.",
        category="Metacognición",
    ),
    Module(
        name="Goal & Value Manager",
        description="Define metas, valores y regula principios del sistema.",
        category="Planeación",
    ),
]

AGENTS = {
    "cortex": Agent(
        id="cortex",
        name="CORTEX",
        role="Agente central proactivo",
        purpose=PURPOSE_SEED,
        modules=MODULES,
    )
}

ACTION_LOG: List[ActionLog] = []


@app.get("/api/status")
def get_status() -> dict:
    return {
        "name": "ATAI Leo AI v3.5",
        "purpose": PURPOSE_SEED,
        "agents": list(AGENTS.values()),
        "actions": ACTION_LOG[-25:],
    }


@app.get("/api/agents", response_model=List[Agent])
def list_agents() -> List[Agent]:
    return list(AGENTS.values())


@app.post("/api/messages", response_model=ActionLog)
def send_message(message: A2AMessage) -> ActionLog:
    if message.receiver not in AGENTS:
        raise HTTPException(status_code=404, detail="Agente destino no encontrado")

    log_entry = ActionLog(message=message, accepted=True)
    ACTION_LOG.append(log_entry)
    return log_entry


@app.post("/api/purpose", response_model=Purpose)
def update_purpose(seed: str, description: Optional[str] = None) -> Purpose:
    global PURPOSE_SEED
    PURPOSE_SEED = Purpose(
        seed=seed,
        description=description or PURPOSE_SEED.description,
        updated_at=datetime.utcnow(),
    )
    AGENTS["cortex"] = AGENTS["cortex"].copy(update={"purpose": PURPOSE_SEED})
    return PURPOSE_SEED
