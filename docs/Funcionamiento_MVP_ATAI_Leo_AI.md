# Funcionamiento del MVP ATAI Leo AI v3.5 (React + FastAPI)

Este documento describe cómo opera el MVP entregado: un backend FastAPI que expone el estado de los agentes y un frontend React que consume dichas APIs para visualizar información, chatear con CORTEX, orquestar intents A2A entre varios agentes y enviar mensajes A2A al agente CORTEX.

## Vista general
- **Backend (FastAPI)**
  - Modela el Purpose Seed, los módulos MCP activos y el agente CORTEX.
  - Integra el **Hormonal State Manager** con hormonas digitales (dopamina, serotonina, cortisol, oxitocina y adrenalina).
  - Expone endpoints REST para consultar el estado (`/api/status`), listar agentes (`/api/agents`), ajustar propósito (`/api/purpose`), orquestar intents entre múltiples agentes (`/api/orchestrate`), enviar mensajes A2A (`/api/messages`), regular las hormonas (`/api/hormones`) y conversar con CORTEX (`/api/chat`). Valida que cada agente emisor solo use intents permitidos por su rol.
  - Mantiene un log simple de acciones aceptadas y un historial de chat para mostrar trazabilidad reciente.
- **Frontend (React + Vite)**
  - Obtiene el estado inicial y la lista de agentes para mostrarlos en tarjetas.
  - Permite seleccionar un intent A2A, redactar contenido y enviarlo al backend.
  - Muestra confirmación con la hora de aceptación o error si el envío falla.
  - Incluye una interfaz de chat usuario ↔ CORTEX que renderiza el historial y permite enviar nuevos mensajes.

## Flujo detallado de ejecución
1. **Inicio del backend**: `uvicorn main:app --reload` inicia FastAPI y publica los endpoints.
2. **Inicio del frontend**: `npm run dev` levanta el servidor Vite que proxea al backend en `http://localhost:8000`.
3. **Carga de la UI**:
   - React ejecuta `fetchStatus()` y `fetchAgents()` para poblar el Purpose Seed, módulos y agentes.
   - El Purpose Seed visible proviene del modelo `Purpose` definido en el backend.
   - El estado hormonal se consulta desde el backend y se renderiza en el panel de gauges.
   - El historial inicial de chat se obtiene con `GET /api/chat` para mostrar el primer mensaje de CORTEX y cualquier turno previo.
4. **Orquestación multiagente**:
   - El usuario selecciona agente origen, intent (filtrado según los permisos del rol del emisor) y destinos.
   - El frontend envía un POST a `/api/orchestrate` con `{ sender, intent, content, targets? }`.
   - El backend valida que el intent esté autorizado para ese agente, difunde el mensaje a cada destino y registra un `OrchestrationResult` con pasos por agente. Si CORTEX participa, aplica ajustes neurohormonales.
5. **Envío de mensaje A2A**:
   - El usuario selecciona un intent (`notify_emotion`, `check_alignment`, `report_decision`, `request_plan`) y redacta el contenido.
   - El frontend manda un POST a `/api/messages` con `{ sender, receiver, intent, content }`.
   - FastAPI valida que el receptor exista y, si el emisor es un agente MCP registrado, que el intent esté permitido por su rol; de lo contrario responde con 403.
   - El backend calcula un ajuste neurohormonal sencillo en función del intent y el contenido.
   - El frontend muestra confirmación con la hora del `timestamp` devuelto y refresca los niveles hormonales.
6. **Actualización de propósito** (opcional):
   - Un POST a `/api/purpose` permite cambiar el Purpose Seed y su descripción.
   - El backend actualiza el propósito del agente CORTEX y expone el nuevo estado en `/api/status`.
7. **Chat usuario ↔ CORTEX**:
   - El usuario escribe en el panel de chat; el frontend manda un POST a `/api/chat` con `{ message }`.
   - El backend agrega el turno del usuario, aplica ajustes hormonales heurísticos con intent `user_chat` y genera la respuesta de CORTEX. Si la configuración del LLM es inválida (proveedor no soportado, falta api_key o error del modelo), el backend devuelve un error explicando el problema en lugar de una respuesta determinista.
   - El frontend renderiza ambos turnos cuando el LLM responde y refresca el estado hormonal para mostrar el impacto.

## Modelos y estructuras de datos clave
- **Purpose**: `seed`, `description`, `updated_at`.
- **Module**: `name`, `description`, `category`, `status`.
- **Agent**: `id`, `name`, `role`, `purpose`, `modules`.
- **A2AMessage**: `sender`, `receiver`, `intent`, `content`, `timestamp`.
- **ActionLog**: `{ message: A2AMessage, accepted: bool, reason?: str }`.
- **ChatTurn**: `{ sender, content, timestamp }`.
- **OrchestrationResult**: `{ sender, intent, content, targets, steps: [{ target, delivered, detail, message? }], routed_at }`.

## Endpoints del backend
- `GET /api/status`: retorna nombre del sistema, Purpose Seed, agentes, últimas acciones registradas y la política de intents permitidos por agente.
- `GET /api/agents`: lista completa de agentes MCP en memoria (incluyendo módulos).
- `POST /api/messages`: envía un mensaje A2A; valida receptor, verifica que el emisor use intents autorizados por su rol, aplica una respuesta hormonal heurística y almacena en el log.
- `POST /api/orchestrate`: difunde un intent y contenido a múltiples agentes, validando que el agente origen tenga permiso para ese intent y devolviendo pasos por destino. Ajusta hormonas cuando el destino incluye a CORTEX.
- `POST /api/purpose`: actualiza el Purpose Seed; refleja el cambio en CORTEX y en futuras respuestas de estado.
- `GET /api/hormones`: devuelve el estado actual del Hormonal State Manager.
- `POST /api/hormones`: permite ajustar explícitamente niveles hormonales (por ejemplo, acciones deliberadas de CORTEX).
- `GET /api/llm/config`: devuelve la configuración activa del proveedor/modelo LLM.
- `POST /api/llm/config`: permite definir proveedor, modelo, base_url, prompt, temperatura, límite de tokens y (opcionalmente) la API key. Si la configuración es inválida, el backend devuelve error y no acepta la conversación.
- `GET /api/chat`: retorna el historial reciente de chat usuario ↔ CORTEX (máx. ~50 turnos).
- `POST /api/chat`: agrega un turno de usuario, genera respuesta de CORTEX y devuelve el historial actualizado.
- **Persistencia**: propósito, agentes MCP y log de acciones se guardan en `backend/state.json` y se recargan al iniciar el backend.

## Componentes del frontend
- **`App.jsx`**: orquesta la UI, maneja estado y envíos.
- **`ModuleList`**: tarjeta que muestra los módulos MCP del agente seleccionado.
- **`AgentCard`**: tarjeta con información del agente y su propósito.
- **Formulario A2A**: selector de intent + textarea para contenido; muestra feedback o error y refresca el estado hormonal al completar.
- **Orquestador multiagente**: formulario para elegir origen, destinos y difundir intents A2A con resumen de entregas.
- **Panel Hormonal**: gauges que muestran dopamina, serotonina, cortisol, oxitocina y adrenalina.
- **Regulador Hormonal**: sliders para que CORTEX (vía UI) module manualmente cada hormona.
- **Chat con CORTEX**: historial con burbujas diferenciadas y control de entrada para mensajes del usuario.
- **LLM y prompt**: panel para configurar proveedor/modelo, base URL, temperatura, límite de tokens, API key y prompt de sistema que gobierna la personalidad de CORTEX.

## Cómo interpretar el panel
- **Purpose Seed**: muestra la razón de ser actual del sistema y su descripción.
- **Agentes activos**: tarjetas con rol y módulos MCP cargados en memoria.
- **Envió de A2A**: cada intento exitoso devuelve la hora de aceptación; los errores aparecen en rojo.
- **Chat**: muestra la conversación reciente; cada envío se refleja en dos turnos (usuario y CORTEX) y actualiza los niveles hormonales en pantalla.

## Limitaciones actuales (MVP)
- Sin autenticación; los controles de intent se basan en roles estáticos en memoria.
- Los intents son ilustrativos; la orquestación multiagente es síncrona y en memoria (sin colas ni garantías de entrega).

## Próximos pasos sugeridos
- Incorporar autenticación fuerte y listas de control dinámicas para intents.
- Modelar recepción/entrega A2A real con colas y correlación de mensajes.
- Desplegar agentes adicionales y vincular el flujo introspectivo del documento maestro.
