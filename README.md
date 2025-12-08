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
ver agentes MCP activos, enviar mensajes A2A al agente CORTEX de demostración, un chat directo
usuario ↔ CORTEX y controles para observar/regular el **Hormonal State Manager** (dopamina,
serotonina, cortisol, oxitocina y adrenalina) que influye el comportamiento de CORTEX.

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
