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
ver agentes MCP activos, enviar mensajes A2A al agente CORTEX de demostración y observar/regular el
**Hormonal State Manager** (dopamina, serotonina, cortisol, oxitocina y adrenalina) que influye el
comportamiento de CORTEX.
