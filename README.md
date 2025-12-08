# ATAI Leo AI v3.5

Documentación compacta del sistema ATAI Leo AI alineada con el Documento Maestro v3.5. Consulta
`docs/ATAI_Leo_AI_v3.5_System.md` para la arquitectura modular, el rol de CORTEX y el protocolo A2A.
Para entender cómo funciona el MVP React + FastAPI generado aquí, revisa
`docs/Funcionamiento_MVP_ATAI_Leo_AI.md`, donde se describe el flujo de datos, endpoints y
componentes de la interfaz.

## Ejecutar el MVP (React + FastAPI)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

El frontend usa Vite y apunta por proxy al backend en `http://localhost:8000`. Incluye un panel para
ver agentes MCP activos, orquestar intents A2A hacia múltiples agentes (CORTEX, SELF-REFLECTOR y
GOAL & VALUE MANAGER), enviar mensajes A2A al agente CORTEX de demostración, un chat directo usuario
↔ CORTEX y controles para observar/regular el **Hormonal State Manager** (dopamina, serotonina,
cortisol, oxitocina y adrenalina) que influye el comportamiento de CORTEX.

### Agentes MCP generados (MVP)
- **CORTEX (`cortex`)**: agente central proactivo; ejecuta orquestaciones, recibe todo A2A dirigido a él y es la única voz externa. Usa módulos CORTEX LLM, Purpose Engine, Self-Reflector, Goal & Value Manager y Hormonal State Manager. Intents permitidos: `notify_emotion`, `check_alignment`, `report_decision`, `request_plan`, `user_chat`.
- **SELF-REFLECTOR (`self-reflector`)**: evalúa coherencia interna, narrativa del yo y ensoñación (Self-Model, DMN Simulator). Intents permitidos: `notify_emotion`, `check_alignment`, `report_decision`.
- **GOAL & VALUE MANAGER (`goal-manager`)**: regula principios y metas (Principle Regulator, Meta Reformer). Intents permitidos: `check_alignment`, `report_decision`, `request_plan`.

**Interacción con CORTEX**
- Cuando CORTEX es destino de un A2A (directo o por `/api/orchestrate`), el backend ajusta hormonas según el intent/contenido antes de registrar la entrega.
- CORTEX puede difundir intents a SELF-REFLECTOR y GOAL & VALUE MANAGER; cada entrega queda trazada con `message_id` y `correlation_id` en la cola A2A y el log de acciones.
- El chat usuario → CORTEX analiza alineación con el propósito y tono (amable u hostil) para ajustar dopamina/serotonina/oxitocina o cortisol/adrenalina antes de invocar al LLM; requiere configuración válida y devuelve errores si el proveedor falla o falta la API key.
- **Cómo influyen las hormonas en la respuesta**: el backend toma el estado hormonal resultante y calcula un "mood" (ej. "proactivo y optimista" o "en alerta") mediante `_mood_snapshot()`. Ese mood y los niveles numéricos de dopamina, serotonina, cortisol, oxitocina y adrenalina se inyectan en el prompt de sistema que recibe el LLM, modulando tono, urgencia y foco de la respuesta. Cambios hormonales previos (por chat, A2A u orquestación) alteran el siguiente turno del diálogo.

### Controles de intents por rol
- Cada agente MCP tiene un rol y un conjunto de intents permitidos para emitir.
- El backend valida los intents de orquestación (`/api/orchestrate`) y mensajes A2A (`/api/messages`) según ese rol; si el intent
  no está autorizado se devuelve **403** con el detalle.
- El frontend muestra dinámicamente los intents habilitados para el agente origen en el orquestador multiagente.

### Cola A2A y correlación de mensajes
- Cada entrega A2A se encola con `message_id` y `correlation_id` (para agrupar fan-outs de una misma orquestación).
- Consulta la cola en `/api/messages/queue` o desde el panel "Cola A2A y correlación" del frontend; el estado incluye `queued/delivered/failed` y la hora de encolado/entrega.
- El resumen de orquestación expone el `correlation_id` global y el `message_id` por destino para rastrear retornos o reintentos.

## Persistencia ligera (propósito, agentes y log de acciones)
- El backend persiste propósito, agentes MCP, la cola A2A y el log de acciones en `backend/state.json`.
- El archivo se reescribe en cada actualización de propósito o registro de acción A2A/orquestación/entrega.
- El estado se recarga automáticamente al reiniciar el backend; borra `backend/state.json` para volver a los valores por defecto.

## Configuración centralizada (LLM + prompts de agentes)
- Toda la configuración del backend vive en `backend/config.json`. Incluye proveedor/modelo/base URL del LLM, API key (puede ir en el
  archivo o en la variable de entorno `LLM_API_KEY`) y los prompts de sistema/indicación de interacción para cada agente (CORTEX,
  SELF-REFLECTOR, GOAL & VALUE MANAGER).
- Si el archivo no existe, el backend genera uno con valores por defecto en el primer arranque. Edita los prompts allí para
  ajustar la personalidad y cómo cada agente se relaciona con otros MCP.
- Cuando actualizas el LLM vía `/api/llm/config` o el panel UI, los cambios se escriben de vuelta en `backend/config.json`, de modo
  que el próximo reinicio conserve el proveedor/modelo/prompt/temperatura configurados.

## Conectar un LLM real al chat de CORTEX

1. Exporta la llave del proveedor compatible (ej. OpenAI):
   ```bash
   export LLM_API_KEY="sk-..."
   ```
2. Ajusta modelo, base URL y prompt de sistema desde la UI (panel "LLM y prompt de CORTEX") o vía API:
   ```bash
   curl -X POST http://localhost:8000/api/llm/config \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "openai",
       "model": "gpt-4o-mini",
       "base_url": "https://api.openai.com/v1",
       "system_prompt": "Eres CORTEX...",
       "temperature": 0.35,
       "max_output_tokens": 220,
       "api_key": "sk-... opcional si no usas la env var"
     }'
   ```
3. Cada turno de chat se enviará al modelo configurado, incluyendo contexto de propósito y estado
   neurohormonal. Si la configuración del LLM es inválida o no hay llave, el backend responderá con
   un error indicando que falta configurar el proveedor/credencial.
