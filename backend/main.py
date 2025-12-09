from datetime import datetime
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from openai import APIError, APIStatusError, OpenAI
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
    correlation_id: Optional[str] = Field(
        default=None,
        description="Identificador para agrupar mensajes relacionados dentro de una orquestación o flujo",
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class A2AEnvelope(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    correlation_id: Optional[str] = None
    status: str = Field(default="queued", description="queued | delivered | failed")
    enqueued_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None
    message: A2AMessage


class OrchestrationRequest(BaseModel):
    sender: str = Field(..., description="Agente origen de la orquestación")
    intent: str = Field(..., description="Intent A2A a propagar")
    content: str = Field(..., description="Contenido o hallazgo a distribuir")
    targets: Optional[List[str]] = Field(
        default=None, description="Lista de agentes destino. Si no se envía se difunde a todos menos al origen.",
    )


class OrchestrationStep(BaseModel):
    target: str
    delivered: bool
    detail: str
    message: Optional[A2AMessage] = None
    message_id: Optional[str] = None
    correlation_id: Optional[str] = None
    status: Optional[str] = None


class OrchestrationResult(BaseModel):
    sender: str
    intent: str
    content: str
    targets: List[str]
    correlation_id: str
    steps: List[OrchestrationStep]
    routed_at: datetime


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


class ChatTurn(BaseModel):
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    message: str


class LLMConfig(BaseModel):
    provider: str = Field(default="openai", description="Proveedor LLM, ej. openai")
    model: str = Field(default="gpt-4o-mini", description="Modelo LLM a usar")
    base_url: Optional[str] = Field(
        default=None, description="Base URL opcional para compatible endpoints (ej. Azure, proxy, self-hosted)"
    )
    system_prompt: str = Field(
        default=(
            "Eres CORTEX, agente central del sistema ATAI Leo AI."
            " Responde en español con brevedad operativa, alineado al propósito y valores."
            " Integra el estado neurohormonal como señal de prioridad y tono."
        ),
        description="Prompt de sistema inyectado en cada llamada LLM",
    )
    temperature: float = Field(default=0.35, ge=0, le=1)
    max_output_tokens: int = Field(default=220, ge=16, le=800)


class LLMConfigUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=1)
    max_output_tokens: Optional[int] = Field(default=None, ge=16, le=800)
    api_key: Optional[str] = Field(default=None, description="Llave para el proveedor configurado")


class AgentPrompt(BaseModel):
    system_prompt: str = Field(
        ...,
        description="Prompt base para el agente cuando interactúa con humanos u otros MCP",
    )
    interaction_prompts: Dict[str, str] = Field(
        default_factory=dict,
        description=(
            "Prompts específicos por agente destino para ajustar tono o rol en interacciones A2A"
        ),
    )


class BackendConfig(BaseModel):
    llm: LLMConfigUpdate
    agent_prompts: Dict[str, AgentPrompt]


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
    ),
    "self-reflector": Agent(
        id="self-reflector",
        name="SELF-REFLECTOR",
        role="Metacognición, coherencia interna y reflexión del yo",
        purpose=PURPOSE_SEED,
        modules=[
            Module(
                name="Self-Model",
                description="Construye la narrativa del yo digital y su continuidad.",
                category="Metacognición",
            ),
            Module(
                name="DMN Simulator",
                description="Simula estados de introspección y ensoñación controlada.",
                category="Metacognición",
            ),
        ],
    ),
    "goal-manager": Agent(
        id="goal-manager",
        name="GOAL & VALUE MANAGER",
        role="Regulación de metas, principios y valores operativos",
        purpose=PURPOSE_SEED,
        modules=[
            Module(
                name="Principle Regulator",
                description="Evalúa acciones contra principios y límites operativos.",
                category="Alineación",
            ),
            Module(
                name="Meta Reformer",
                description="Ajusta metas según feedback y aprendizaje contextual.",
                category="Planeación",
            ),
        ],
    ),
}

ACTION_LOG: List[ActionLog] = []
A2A_QUEUE: List[A2AEnvelope] = []
CHAT_LOG: List[ChatTurn] = [
    ChatTurn(
        sender="cortex",
        content=(
            "Canal directo con CORTEX listo. Comparte contexto operativo o dudas y"
            " responderé considerando propósito y estado neurohormonal."
        ),
    )
]

LLM_CONFIG = LLMConfig()
LLM_API_KEY: Optional[str] = os.getenv("LLM_API_KEY")
LLM_CLIENT: Optional[OpenAI] = None
CONFIG_PATH = Path(__file__).parent / "config.json"
STATE_PATH = Path(__file__).parent / "state.json"
BACKEND_CONFIG: Optional[BackendConfig] = None
AGENT_PROMPTS: Dict[str, AgentPrompt] = {}

# Intents permitidos según rol. Si un rol no está presente, se usará la lista por defecto.
DEFAULT_INTENTS = {"notify_emotion", "check_alignment", "report_decision", "request_plan", "user_chat"}
ROLE_INTENTS: Dict[str, set[str]] = {
    "Agente central proactivo": DEFAULT_INTENTS,
    "Metacognición, coherencia interna y reflexión del yo": {"notify_emotion", "check_alignment", "report_decision"},
    "Regulación de metas, principios y valores operativos": {"check_alignment", "report_decision", "request_plan"},
}


def _default_config() -> BackendConfig:
    cortex_prompt = AgentPrompt(
        system_prompt=(
            "Eres CORTEX, agente central del sistema ATAI Leo AI."
            " Responde en español con brevedad operativa, alineado al propósito y valores."
            " Integra el estado neurohormonal como señal de prioridad y tono."
        ),
        interaction_prompts={
            "self-reflector": "Solicita introspección breve y coherencia con valores.",
            "goal-manager": "Pide metas accionables y restricciones de principios.",
        },
    )

    return BackendConfig(
        llm=LLMConfigUpdate(
            provider="openai",
            model="gpt-4o-mini",
            temperature=0.35,
            max_output_tokens=220,
            api_key=os.getenv("LLM_API_KEY"),
            system_prompt=cortex_prompt.system_prompt,
        ),
        agent_prompts={
            "cortex": cortex_prompt,
            "self-reflector": AgentPrompt(
                system_prompt=(
                    "Eres SELF-REFLECTOR. Evalúas coherencia interna, riesgos y alineación con"
                    " propósito. Devuelve observaciones concisas y señales de desalineación."
                ),
                interaction_prompts={"cortex": "Entrega reflexión sintética en 2-3 frases."},
            ),
            "goal-manager": AgentPrompt(
                system_prompt=(
                    "Eres GOAL & VALUE MANAGER. Custodias metas, valores y principios."
                    " Genera ajustes accionables y verificables cuando CORTEX los pida."
                ),
                interaction_prompts={"cortex": "Responde con metas priorizadas y criterios."},
            ),
        },
    )


def _persist_config() -> None:
    if BACKEND_CONFIG is None:
        return
    CONFIG_PATH.write_text(
        BACKEND_CONFIG.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _load_config() -> None:
    global BACKEND_CONFIG, LLM_CONFIG, LLM_API_KEY, AGENT_PROMPTS

    if not CONFIG_PATH.exists():
        BACKEND_CONFIG = _default_config()
        _persist_config()
    else:
        try:
            raw = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            BACKEND_CONFIG = BackendConfig(**raw)
        except Exception:
            BACKEND_CONFIG = _default_config()
            _persist_config()

    AGENT_PROMPTS = BACKEND_CONFIG.agent_prompts

    llm_payload = BACKEND_CONFIG.llm.model_dump(exclude_none=True)
    LLM_API_KEY = llm_payload.pop("api_key", None) or os.getenv("LLM_API_KEY")

    # Fusionar defaults con configuración cargada
    LLM_CONFIG = LLMConfig(**{**LLM_CONFIG.model_dump(), **llm_payload})


def _persist_state() -> None:
    """Persiste propósito, agentes, colas A2A y log de acciones a disco para sobrevivir reinicios."""

    payload = {
        "purpose": PURPOSE_SEED.model_dump(),
        "agents": {agent_id: agent.model_dump() for agent_id, agent in AGENTS.items()},
        "actions": [log.model_dump() for log in ACTION_LOG],
        "queue": [envelope.model_dump() for envelope in A2A_QUEUE],
    }

    STATE_PATH.write_text(json.dumps(payload, default=str, ensure_ascii=False, indent=2))


def _load_state() -> None:
    global PURPOSE_SEED, AGENTS, ACTION_LOG, A2A_QUEUE

    if not STATE_PATH.exists():
        _persist_state()
        return

    try:
        data = json.loads(STATE_PATH.read_text())
    except json.JSONDecodeError:
        # Si el archivo se corrompe o es ilegible, rehacer con defaults en memoria.
        _persist_state()
        return

    if "purpose" in data:
        PURPOSE_SEED = Purpose(**data["purpose"])

    if "agents" in data:
        restored_agents: Dict[str, Agent] = {}
        for agent_id, agent_payload in data["agents"].items():
            restored_agents[agent_id] = Agent(**agent_payload)
        AGENTS = restored_agents

    if "actions" in data:
        ACTION_LOG.clear()
        for raw_action in data["actions"]:
            ACTION_LOG.append(
                ActionLog(
                    message=A2AMessage(**raw_action["message"]),
                    accepted=raw_action.get("accepted", False),
                    reason=raw_action.get("reason"),
                )
            )

    if "queue" in data:
        A2A_QUEUE.clear()
        for raw_envelope in data["queue"]:
            A2A_QUEUE.append(A2AEnvelope(**raw_envelope))


_load_config()
_load_state()


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


def _adapt_hormones_from_chat(user_message: str) -> Dict[str, float]:
    """Ajusta hormonas considerando alineación con el propósito y tono del usuario."""

    global HORMONAL_STATE
    content = user_message.lower()
    alignment_positive = [
        "optimizar",
        "monitor",
        "alineado",
        "propósito",
        "valores",
        "coherente",
        "mejora",
        "proactivo",
    ]
    alignment_negative = ["desalineado", "ignora", "romper", "abandonar", "sabotear", "innecesario"]
    friendly_tokens = ["gracias", "por favor", "excelente", "buen", "amable", "apoyo", "ayuda"]
    hostile_tokens = ["malo", "inútil", "odio", "tonto", "hostil", "molesto", "enojado", "fastidioso"]

    delta = {"dopamine": 0.0, "serotonin": 0.0, "cortisol": 0.0, "oxytocin": 0.0, "adrenaline": 0.0}

    aligned_hits = sum(token in content for token in alignment_positive)
    misaligned_hits = sum(token in content for token in alignment_negative)
    friendly_hits = sum(token in content for token in friendly_tokens)
    hostile_hits = sum(token in content for token in hostile_tokens)

    if aligned_hits:
        delta["dopamine"] += 3 * aligned_hits
        delta["serotonin"] += 2 * aligned_hits
    if misaligned_hits:
        delta["cortisol"] += 4 * misaligned_hits
        delta["adrenaline"] += 3 * misaligned_hits
        delta["dopamine"] -= 1.5 * misaligned_hits

    if friendly_hits:
        delta["oxytocin"] += 4 + friendly_hits
        delta["serotonin"] += 2
        delta["cortisol"] -= 2
    if hostile_hits:
        delta["cortisol"] += 6 + 2 * hostile_hits
        delta["adrenaline"] += 4
        delta["serotonin"] -= 2
        delta["oxytocin"] -= 3

    # Pequeño sesgo a dopamina cuando el usuario invita a acción alineada
    if "actua" in content or "ejecuta" in content or "ayuda" in content:
        delta["dopamine"] += 2

    updated = HORMONAL_STATE.model_dump()
    for hormone, change in delta.items():
        updated[hormone] = max(0, min(100, updated[hormone] + change))

    # Registrar impacto del chat como parte del bucle neurohormonal del diálogo
    HORMONAL_STATE = HormonalState(**updated)
    return delta


def _allowed_intents_for_agent(agent_id: str) -> set[str]:
    agent = AGENTS.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado para validar intents")
    return ROLE_INTENTS.get(agent.role, DEFAULT_INTENTS)


def _validate_intent(sender_id: str, intent: str) -> None:
    """Valida que el agente emisor pueda usar el intent solicitado según su rol."""

    allowed = _allowed_intents_for_agent(sender_id)
    if intent not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Intent '{intent}' no permitido para el rol del agente {sender_id}",
        )


def _update_hormones_from_payload(payload: HormoneUpdate) -> HormonalState:
    global HORMONAL_STATE
    current = HORMONAL_STATE.model_dump()
    for hormone, value in payload.model_dump(exclude_none=True).items():
        current[hormone] = value
    HORMONAL_STATE = HormonalState(**current)
    return HORMONAL_STATE


def _ensure_llm_client() -> OpenAI:
    global LLM_CLIENT

    if LLM_CONFIG.provider.lower() != "openai":
        raise HTTPException(
            status_code=400,
            detail=(
                "Proveedor LLM no soportado en el demo. Configure 'openai' para usar el chat con CORTEX."
            ),
        )

    if not LLM_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="LLM no configurado: proporcione api_key y modelo para habilitar respuestas del chat.",
        )

    if LLM_CLIENT is None:
        LLM_CLIENT = OpenAI(api_key=LLM_API_KEY, base_url=LLM_CONFIG.base_url)
    return LLM_CLIENT


def _llm_messages(user_message: str, mood: str) -> List[Dict[str, str]]:
    hormone_state = HORMONAL_STATE
    context = (
        f"Purpose Seed: {PURPOSE_SEED.seed}. "
        f"Descripción: {PURPOSE_SEED.description}. "
        "Eres el agente CORTEX y actúas como única voz hacia el exterior."
    )
    hormones = (
        f"dopamina={hormone_state.dopamine:.0f}, serotonina={hormone_state.serotonin:.0f}, "
        f"cortisol={hormone_state.cortisol:.0f}, oxitocina={hormone_state.oxytocin:.0f}, "
        f"adrenalina={hormone_state.adrenaline:.0f}."
    )
    cortex_prompt = AGENT_PROMPTS.get("cortex")
    system_base = cortex_prompt.system_prompt if cortex_prompt else LLM_CONFIG.system_prompt
    interaction_notes = ""
    if cortex_prompt and cortex_prompt.interaction_prompts:
        pairs = ", ".join(
            f"{target}: {hint}" for target, hint in cortex_prompt.interaction_prompts.items()
        )
        interaction_notes = f" Instrucciones de interacción A2A: {pairs}."

    system_prompt = (
        f"{system_base}\n\n"
        f"Contexto operativo: {context}\n"
        f"Estado neurohormonal: {hormones} Sesgo/mood: {mood}."
        f" Responde en español, tono ejecutivo, conciso, ofreciendo siguiente paso claro.{interaction_notes}"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]


def _generate_llm_reply(user_message: str, mood: str) -> str:
    client = _ensure_llm_client()

    try:
        response = client.responses.create(
            model=LLM_CONFIG.model,
            messages=_llm_messages(user_message, mood),
            temperature=LLM_CONFIG.temperature,
            max_output_tokens=LLM_CONFIG.max_output_tokens,
        )
    except (APIError, APIStatusError) as api_err:
        raise HTTPException(status_code=502, detail=f"Error del proveedor LLM: {api_err}")
    except Exception as exc:  # pragma: no cover - fallback para errores inesperados
        raise HTTPException(status_code=500, detail=f"No se pudo invocar el LLM: {exc}")

    if hasattr(response, "output_text") and response.output_text:
        return response.output_text

    raise HTTPException(status_code=502, detail="El LLM no devolvió texto utilizable para la respuesta")


def _mood_snapshot() -> str:
    state = HORMONAL_STATE
    uplift = state.dopamine + state.serotonin + state.oxytocin
    tension = state.cortisol + state.adrenaline
    balance = uplift - tension

    if balance > 25:
        return "proactivo y optimista"
    if balance > 5:
        return "estable y atento"
    if balance > -10:
        return "cauto, priorizando claridad"
    return "en alerta, priorizando mitigación y claridad"


def _generate_cortex_reply(user_message: str) -> str:
    mood = _mood_snapshot()
    if len(user_message) > 160:
        user_message = user_message[:157] + "..."

    return _generate_llm_reply(user_message, mood)


def _deliver_envelope(envelope: A2AEnvelope) -> OrchestrationStep:
    target = envelope.message.receiver
    if target not in AGENTS:
        envelope.status = "failed"
        envelope.delivered_at = datetime.utcnow()
        return OrchestrationStep(
            target=target,
            delivered=False,
            detail="Agente destino no encontrado",
            message=envelope.message,
            message_id=envelope.message_id,
            correlation_id=envelope.correlation_id,
            status=envelope.status,
        )

    if target == "cortex":
        deltas = _apply_hormonal_response(envelope.message)
        ACTION_LOG.append(
            ActionLog(
                message=envelope.message,
                accepted=True,
                reason=f"CORTEX ajustó neurohormonas {deltas}",
            )
        )
        detail = "Entregado a CORTEX con retroalimentación neurohormonal"
    else:
        ACTION_LOG.append(
            ActionLog(
                message=envelope.message,
                accepted=True,
                reason="Entregado a agente colaborador",
            )
        )
        detail = "Entregado a agente colaborador para evaluación interna"

    envelope.status = "delivered"
    envelope.delivered_at = datetime.utcnow()
    _persist_state()

    return OrchestrationStep(
        target=target,
        delivered=True,
        detail=detail,
        message=envelope.message,
        message_id=envelope.message_id,
        correlation_id=envelope.correlation_id,
        status=envelope.status,
    )


def _enqueue_message(sender: str, target: str, intent: str, content: str, correlation_id: Optional[str]) -> A2AEnvelope:
    message = A2AMessage(
        sender=sender,
        receiver=target,
        intent=intent,
        content=content,
        correlation_id=correlation_id,
    )
    envelope = A2AEnvelope(message=message, correlation_id=correlation_id)
    A2A_QUEUE.append(envelope)
    _persist_state()
    return envelope


def _dispatch_message(sender: str, target: str, intent: str, content: str, correlation_id: str) -> OrchestrationStep:
    if target not in AGENTS:
        return OrchestrationStep(
            target=target,
            delivered=False,
            detail="Agente destino no encontrado",
        )

    envelope = _enqueue_message(sender, target, intent, content, correlation_id)
    return _deliver_envelope(envelope)


def _orchestrate(payload: OrchestrationRequest) -> OrchestrationResult:
    if payload.sender not in AGENTS:
        raise HTTPException(status_code=404, detail="Agente origen no encontrado para orquestación")

    _validate_intent(payload.sender, payload.intent)

    correlation_id = str(uuid4())
    targets = payload.targets or [agent_id for agent_id in AGENTS if agent_id != payload.sender]
    steps = [
        _dispatch_message(
            sender=payload.sender,
            target=target,
            intent=payload.intent,
            content=payload.content,
            correlation_id=correlation_id,
        )
        for target in targets
    ]

    return OrchestrationResult(
        sender=payload.sender,
        intent=payload.intent,
        content=payload.content,
        targets=targets,
        correlation_id=correlation_id,
        steps=steps,
        routed_at=datetime.utcnow(),
    )


@app.get("/api/status")
def get_status() -> dict:
    return {
        "name": "ATAI Leo AI v3.5",
        "purpose": PURPOSE_SEED,
        "agents": list(AGENTS.values()),
        "hormonal_state": HORMONAL_STATE,
        "actions": ACTION_LOG[-25:],
        "llm_config": LLM_CONFIG,
        "agent_prompts": AGENT_PROMPTS,
        "config_path": str(CONFIG_PATH),
        "intent_policy": {
            agent_id: sorted(_allowed_intents_for_agent(agent_id)) for agent_id in AGENTS
        },
        "queue": A2A_QUEUE[-25:],
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


@app.get("/api/llm/config", response_model=LLMConfig)
def get_llm_config() -> LLMConfig:
    return LLM_CONFIG


@app.post("/api/llm/config", response_model=LLMConfig)
def update_llm_config(payload: LLMConfigUpdate) -> LLMConfig:
    global LLM_CONFIG, LLM_API_KEY, BACKEND_CONFIG
    updates = payload.model_dump(exclude_none=True)
    api_key = updates.pop("api_key", None)
    if api_key:
        LLM_API_KEY = api_key

    LLM_CONFIG = LLM_CONFIG.copy(update=updates)
    if BACKEND_CONFIG:
        BACKEND_CONFIG = BACKEND_CONFIG.copy(update={"llm": payload})
        _persist_config()
    _ensure_llm_client()
    return LLM_CONFIG


@app.get("/api/chat", response_model=List[ChatTurn])
def get_chat() -> List[ChatTurn]:
    return CHAT_LOG[-50:]


@app.post("/api/chat", response_model=List[ChatTurn])
def chat_with_cortex(payload: ChatRequest) -> List[ChatTurn]:
    user_turn = ChatTurn(sender="usuario", content=payload.message)
    CHAT_LOG.append(user_turn)

    # Ajustar estado neurohormonal según alineación y tono del diálogo
    _adapt_hormones_from_chat(payload.message)

    cortex_reply = ChatTurn(sender="cortex", content=_generate_cortex_reply(payload.message))
    CHAT_LOG.append(cortex_reply)

    if len(CHAT_LOG) > 120:
        del CHAT_LOG[:-120]

    return CHAT_LOG[-50:]


@app.post("/api/messages", response_model=ActionLog)
def send_message(message: A2AMessage) -> ActionLog:
    if message.receiver not in AGENTS:
        raise HTTPException(status_code=404, detail="Agente destino no encontrado")

    if message.sender in AGENTS:
        _validate_intent(message.sender, message.intent)

    envelope = _enqueue_message(
        sender=message.sender,
        target=message.receiver,
        intent=message.intent,
        content=message.content,
        correlation_id=message.correlation_id or str(uuid4()),
    )
    step = _deliver_envelope(envelope)

    if not step.delivered:
        raise HTTPException(status_code=500, detail=step.detail)

    return ACTION_LOG[-1]


@app.get("/api/messages/queue", response_model=List[A2AEnvelope])
def list_queue(limit: int = 50) -> List[A2AEnvelope]:
    """Devuelve la cola A2A (cola global de recepción) con mensajes correlacionados."""

    return A2A_QUEUE[-limit:]


@app.post("/api/orchestrate", response_model=OrchestrationResult)
def orchestrate(request: OrchestrationRequest) -> OrchestrationResult:
    """Distribuye un intent y contenido A2A a múltiples agentes, priorizando CORTEX."""

    return _orchestrate(request)


@app.post("/api/purpose", response_model=Purpose)
def update_purpose(seed: str, description: Optional[str] = None) -> Purpose:
    global PURPOSE_SEED
    PURPOSE_SEED = Purpose(
        seed=seed,
        description=description or PURPOSE_SEED.description,
        updated_at=datetime.utcnow(),
    )
    AGENTS["cortex"] = AGENTS["cortex"].copy(update={"purpose": PURPOSE_SEED})
    _persist_state()
    return PURPOSE_SEED
