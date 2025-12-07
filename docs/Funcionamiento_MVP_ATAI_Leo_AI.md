# Funcionamiento del MVP ATAI Leo AI v3.5 (React + FastAPI)

Este documento describe cómo opera el MVP entregado: un backend FastAPI que expone el estado de los agentes y un frontend React que consume dichas APIs para visualizar información y enviar mensajes A2A al agente CORTEX.

## Vista general
- **Backend (FastAPI)**
  - Modela el Purpose Seed, los módulos MCP activos y el agente CORTEX.
  - Expone endpoints REST para consultar el estado (`/api/status`), listar agentes (`/api/agents`), actualizar el propósito (`/api/purpose`) y enviar mensajes A2A (`/api/messages`).
  - Mantiene un log simple de acciones aceptadas para mostrar trazabilidad reciente.
- **Frontend (React + Vite)**
  - Obtiene el estado inicial y la lista de agentes para mostrarlos en tarjetas.
  - Permite seleccionar un intent A2A, redactar contenido y enviarlo al backend.
  - Muestra confirmación con la hora de aceptación o error si el envío falla.

## Flujo detallado de ejecución
1. **Inicio del backend**: `uvicorn main:app --reload` inicia FastAPI y publica los endpoints.
2. **Inicio del frontend**: `npm run dev` levanta el servidor Vite que proxea al backend en `http://localhost:8000`.
3. **Carga de la UI**:
   - React ejecuta `fetchStatus()` y `fetchAgents()` para poblar el Purpose Seed, módulos y agentes.
   - El Purpose Seed visible proviene del modelo `Purpose` definido en el backend.
4. **Envío de mensaje A2A**:
   - El usuario selecciona un intent (`notify_emotion`, `check_alignment`, `report_decision`, `request_plan`) y redacta el contenido.
   - El frontend manda un POST a `/api/messages` con `{ sender, receiver, intent, content }`.
   - FastAPI valida que el receptor exista y agrega la acción al log en memoria.
   - El frontend muestra confirmación con la hora del `timestamp` devuelto.
5. **Actualización de propósito** (opcional):
   - Un POST a `/api/purpose` permite cambiar el Purpose Seed y su descripción.
   - El backend actualiza el propósito del agente CORTEX y expone el nuevo estado en `/api/status`.

## Modelos y estructuras de datos clave
- **Purpose**: `seed`, `description`, `updated_at`.
- **Module**: `name`, `description`, `category`, `status`.
- **Agent**: `id`, `name`, `role`, `purpose`, `modules`.
- **A2AMessage**: `sender`, `receiver`, `intent`, `content`, `timestamp`.
- **ActionLog**: `{ message: A2AMessage, accepted: bool, reason?: str }`.

## Endpoints del backend
- `GET /api/status`: retorna nombre del sistema, Purpose Seed, agentes y últimas acciones registradas.
- `GET /api/agents`: lista completa de agentes MCP en memoria (incluyendo módulos).
- `POST /api/messages`: envía un mensaje A2A; valida receptor y almacena en el log.
- `POST /api/purpose`: actualiza el Purpose Seed; refleja el cambio en CORTEX y en futuras respuestas de estado.

## Componentes del frontend
- **`App.jsx`**: orquesta la UI, maneja estado y envíos.
- **`ModuleList`**: tarjeta que muestra los módulos MCP del agente seleccionado.
- **`AgentCard`**: tarjeta con información del agente y su propósito.
- **Formulario A2A**: selector de intent + textarea para contenido; muestra feedback o error.

## Cómo interpretar el panel
- **Purpose Seed**: muestra la razón de ser actual del sistema y su descripción.
- **Agentes activos**: tarjetas con rol y módulos MCP cargados en memoria.
- **Envió de A2A**: cada intento exitoso devuelve la hora de aceptación; los errores aparecen en rojo.

## Limitaciones actuales (MVP)
- Estado en memoria: no persiste entre reinicios.
- Sin autenticación ni permisos A2A.
- El log de acciones es acotado (últimos ~25 elementos en `/api/status`).
- Los intents son ilustrativos; no hay orquestación real entre múltiples agentes.

## Próximos pasos sugeridos
- Añadir persistencia para propósito, agentes y log de acciones.
- Incorporar autenticación y controles de intents por rol.
- Modelar recepción/entrega A2A real con colas y correlación de mensajes.
- Desplegar agentes adicionales y vincular el flujo introspectivo del documento maestro.
