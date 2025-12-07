# ATAI Leo AI v3.5

Documentación compacta del sistema ATAI Leo AI alineada con el Documento Maestro v3.5. Consulta
`docs/ATAI_Leo_AI_v3.5_System.md` para la arquitectura modular, el rol de CORTEX y el protocolo A2A.

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
ver agentes MCP activos y enviar mensajes A2A al agente CORTEX de demostración.
