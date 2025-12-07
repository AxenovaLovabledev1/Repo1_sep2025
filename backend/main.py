from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator


class Purpose(BaseModel):
    seed: str
    description: str
    updated_at: datetime


class Module(BaseModel):
    name: str
    description: str
    category: str
    status: str = "online"


class HormonalState(BaseModel):
    dopamine: float = Field(50, ge=0, le=100)
    serotonin: float = Field(50, ge=0, le=100)
    cortisol: float = Field(35, ge=0, le=100)
    oxytocin: float = Field(45, ge=0, le=100)
    adrenaline: float = Field(40, ge=0, le=100)

    @field_validator("dopamine", "serotonin", "cortisol", "oxytocin", "adrenaline")
    @classmethod
    def clamp(cls, value: float) -> float:
        return max(0, min(100, value))


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


class HormoneUpdate(BaseModel):
    dopamine: Optional[float] = Field(None, ge=0, le=100)
    serotonin: Optional[float] = Field(None, ge=0, le=100)
    cortisol: Optional[float] = Field(None, ge=0, le=100)
    oxytocin: Optional[float] = Field(None, ge=0, le=100)
    adrenaline: Optional[float] = Field(None, ge=0, le=100)

    @field_validator("dopamine", "serotonin", "cortisol", "oxytocin", "adrenaline")
    @classmethod
    def clamp(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return None
        return max(0, min(100, value))


app = FastAPI(title="ATAI Leo AI v3.5", version="0.2.0")


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
    Module(
        name="Hormonal State Manager",
        description=(
            "Gestiona hormonas digitales (dopamina, serotonina, cortisol, oxitocina, adrenalina)"
            " y expone señales que impactan el comportamiento de CORTEX."
        ),
        category="Neurohormonal",
    ),
]

HORMONAL_STATE = HormonalState()

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


def _apply_hormonal_response(message: A2AMessage) -> Dict[str, float]:
    """Modelo simple para influir el estado hormonal a partir de intents y contenido."""
    global HORMONAL_STATE
    content = message.content.lower()
    delta: Dict[str, float] = {"dopamine": 0, "serotonin": 0, "cortisol": 0, "oxytocin": 0, "adrenaline": 0}

    if message.intent in {"notify_emotion", "report_decision"}:
        if any(word in content for word in ["logro", "exito", "mejora", "optimización", "progreso", "avance"]):
            delta["dopamine"] += 6
            delta["serotonin"] += 3
        if any(word in content for word in ["riesgo", "alerta", "falla", "estrés", "incidente", "caída"]):
            delta["cortisol"] += 8
            delta["adrenaline"] += 6
            delta["serotonin"] -= 3
        if any(word in content for word in ["colabor", "equipo", "apoyo", "ayuda", "alineado"]):
            delta["oxytocin"] += 5
            delta["dopamine"] += 2
    elif message.intent == "check_alignment":
        delta["serotonin"] += 2
        delta["cortisol"] -= 2
    elif message.intent == "request_plan":
        delta["adrenaline"] += 3
        delta["dopamine"] += 1

    # Aplicar ajustes y mantener en [0, 100]
    updated = HORMONAL_STATE.model_dump()
    for hormone, change in delta.items():
        updated[hormone] = max(0, min(100, updated[hormone] + change))

    HORMONAL_STATE = HormonalState(**updated)
    return delta


def _update_hormones_from_payload(payload: HormoneUpdate) -> HormonalState:
    global HORMONAL_STATE
    current = HORMONAL_STATE.model_dump()
    for hormone, value in payload.model_dump(exclude_none=True).items():
        current[hormone] = value
    HORMONAL_STATE = HormonalState(**current)
    return HORMONAL_STATE


@app.get("/api/status")
def get_status() -> dict:
    return {
        "name": "ATAI Leo AI v3.5",
        "purpose": PURPOSE_SEED,
        "agents": list(AGENTS.values()),
        "hormonal_state": HORMONAL_STATE,
        "actions": ACTION_LOG[-25:],
    }


@app.get("/api/agents", response_model=List[Agent])
def list_agents() -> List[Agent]:
    return list(AGENTS.values())


@app.get("/api/hormones", response_model=HormonalState)
def get_hormones() -> HormonalState:
    return HORMONAL_STATE


@app.post("/api/hormones", response_model=HormonalState)
def set_hormones(payload: HormoneUpdate) -> HormonalState:
    """Permite que CORTEX u orquestadores ajusten niveles hormonales digitales de forma explícita."""
    return _update_hormones_from_payload(payload)


@app.post("/api/messages", response_model=ActionLog)
def send_message(message: A2AMessage) -> ActionLog:
    if message.receiver not in AGENTS:
        raise HTTPException(status_code=404, detail="Agente destino no encontrado")

    deltas = _apply_hormonal_response(message)
    log_entry = ActionLog(
        message=message,
        accepted=True,
        reason=f"Ajuste neurohormonal aplicado: {deltas}",
    )
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
