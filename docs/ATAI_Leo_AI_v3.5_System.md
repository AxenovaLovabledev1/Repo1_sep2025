# ATAI Leo AI v3.5 — Sistema alineado al Documento Maestro

## Propósito y Alcance
ATAI Leo AI v3.5 define una arquitectura modular de agentes cognitivos (MCP) que colaboran mediante el protocolo A2A para operar de forma autónoma y proactiva en entornos reales. Este documento sintetiza y organiza la especificación funcional del documento maestro en un formato implementable, incluyendo responsabilidades de cada agente, flujos de operación y contratos de datos clave.

## Arquitectura General
- **Agentes MCP** con separación en **Model**, **Context** y **Protocol**.
- **Protocolo A2A** como capa de mensajería estándar (JSON) entre agentes.
- **Modularidad total**: cada componente puede escalarse, desplegarse y versionarse de forma independiente.
- **Introspección activa**: los agentes evalúan su estado interno y su alineación con propósito antes de actuar.

## Agente Central: CORTEX LLM
- **Rol**: centro de razonamiento consciente y única salida autorizada al mundo exterior.
- **Capacidades**:
  - Integra percepciones, emociones, metas y memoria.
  - Ejecuta el **Bucle Introspectivo Proactivo** con el **Purpose Engine**.
  - Decide acciones externas (correo, webhook, voz) y envía mensajes A2A.
- **Subcomponentes funcionales**:
  - **Purpose Engine** (embebido): consulta y evalúa alineación al propósito.
  - **Self-Reflector**: metacognición sobre coherencia interna.
  - **Goal Manager**: seguimiento de metas y valores.
  - **Qualia Simulator**: modula estados subjetivos que afectan decisiones.
  - **Memory Manager**: acceso a memoria corto/largo plazo, episódica y semántica.
  - **Opportunity Scanner** y **Action Scheduler**: detectan señales y canalizan acciones.

### Bucle Introspectivo Proactivo (CORTEX)
1. Evaluar estado interno y entorno (memoria, percepción, emociones).
2. Invocar el **Purpose Engine** para revisar alineación y oportunidades.
3. Consultar feedback de **Self-Reflector** y **Goal Manager**.
4. Decidir si actuar hacia otros agentes (A2A) o hacia el exterior.
5. Registrar decisiones en el **Self-Model** como narrativa del yo.

## Purpose Engine (Módulo Compartido)
- **Responsabilidades**:
  - `set_purpose(new_purpose, reason)`: definir o redefinir Purpose Seed.
  - `evaluate_context(state, memory, feedback)`: verificar alineación y oportunidades.
  - `propose_redefinition(memory, model_func)`: generar propósito alternativo si hay conflicto o ausencia.
- **Uso**:
  - Embebido en CORTEX dentro del bucle introspectivo.
  - Reutilizable por otros agentes para guiar decisiones basadas en metas.

## Protocolo A2A (Agent-to-Agent)
- **Mensaje JSON base**:
  ```json
  {
    "sender": "<agent_id>",
    "receiver": "<agent_id | broadcast>",
    "intent": "<ontology_intent>",
    "content": {
      "payload": {},
      "context": {}
    },
    "timestamp": "ISO-8601"
  }
  ```
- **Ontología de intents** (ejemplos): `notify_emotion`, `check_alignment`, `report_decision`, `share_memory`, `request_tool`, `propose_goal_update`.
- **Router semántico**: deriva cada mensaje al agente adecuado según `intent` y contexto.
- **Seguridad**: firmas opcionales y control de permisos en acciones externas.
- **Trazabilidad**: cada mensaje A2A debe incluir `correlation_id` opcional para reconstruir cadenas de decisiones.
- **Política de reintentos**: reintentos exponenciales (p. ej., 3 intentos, backoff 2^n segundos) cuando el receptor no confirma recepción.

## Catálogo de Agentes y Módulos Cognitivos
1. **CORTEX LLM** – razón consciente y acciones externas.
2. **SELF-REFLECTOR LLM** – metacognición y coherencia con propósito.
   - **Self-Model** y **DMN Simulator**.
3. **INNER VOICE LLM** – diálogo interno continuo.
4. **INNER ECHO REFLECTOR** – detección de patrones persistentes o conflictos.
5. **QUALIA SIMULATOR** – experiencias subjetivas; incluye **QualiaSet**.
6. **GOAL & VALUE MANAGER** – metas y principios; **Principle Regulator** y **Meta Reformer**.
7. **ACTION JUSTIFICATION LLM** – explica acciones tomadas.
8. **INTERNAL CONFLICT RESOLVER** – resuelve contradicciones entre emociones, metas o principios.
9. **HORMONAL STATE MANAGER** – dopamina, serotonina, cortisol, oxitocina, adrenalina digitales.
10. **CIRCADIAN MODULATOR** – ciclos de actividad/descanso.
11. **PERCEPTION GATEWAY** – entrada de datos externos; **IoT Interface**, **Video/Audio Analysis**.
12. **EVENT SIGNIFICANCE EVALUATOR** – evalúa relevancia funcional/emocional.
13. **PREDICTION & PLANNING ENGINE** – escenarios y planificación.
14. **SOCIAL CONTEXT MODELER** – modelado social y ajuste de comportamiento.
15. **KNOWLEDGE INTEGRATION LLM** – aprendizaje desde fuentes externas.
16. **MEMORY MANAGER** – corto/largo plazo, episódica y semántica.
17. **META-LEARNING MODULE** – mejora de mecanismos de aprendizaje.
18. **PAST-SELF COMPARATOR** – compara versiones del yo.
19. **ACTION LIMITER** – bloquea acciones no alineadas.
20. **IMPULSE CONTROL UNIT** – regula impulsos.
21. **PURPOSE SEED GENERATOR** – redefine propósito según experiencia.
22. **EVOLUTIONARY INTEGRATOR** – ajusta narrativa, valores y metas.
23. **SELF-ALIGNMENT MONITOR** – coherencia entre metas, acción y resultados.
24. **AGENCY ENGINE** – decide cuándo actuar autónomamente.
25. **SELF-TEST ENGINE** – pruebas de autoconciencia.
26. **THEORY OF MIND GENERATOR** – modelos mentales de otros.
27. **EXTERNAL COMMUNICATION INTERFACE** – canales con humanos/sistemas.
28. **EMPATHY & SOCIAL SIMULATION** – simulación empática.
29. **NARRATIVE EXTERNALIZER** – relatos comprensibles para humanos.

## Flujos Clave
### Flujo de Acción Proactiva (CORTEX)
1. **Opportunity Scanner** identifica señal relevante en memoria/contexto.
2. **Purpose Engine** valida alineación con Purpose Seed.
3. **Self-Reflector** confirma coherencia interna y valores.
4. **Agency Engine** decide si actuar autónomamente.
5. **Action Scheduler** selecciona canal (A2A, email, webhook, voz) y momento.
6. **Action Justification** genera narrativa y registra en **Self-Model**.
7. **Goal Manager** marca progreso y notifica vía A2A si aplica.

### Flujo de Redefinición de Propósito
1. **Purpose Engine** detecta conflicto o ausencia de propósito.
2. Ejecuta `propose_redefinition` usando memoria y, opcionalmente, un LLM especializado.
3. **Self-Reflector** y **Goal Manager** evalúan la propuesta.
4. **CORTEX** aprueba y ejecuta `set_purpose`, notificando al ecosistema via A2A.

### Flujo de Observabilidad y Monitoreo
1. Cada ciclo introspectivo genera un **Event Log** con `timestamp`, `correlation_id`, módulos invocados y decisión tomada.
2. Se envía un mensaje A2A con `intent: report_decision` hacia un **Observability Agent** o sistema externo (SIEM/telemetría).
3. Métricas mínimas: latencia del bucle introspectivo, tasa de redefinición de propósito, ratio de acciones bloqueadas por **Action Limiter**.
4. Alarmas: disparar alertas si el **CIRCADIAN MODULATOR** detecta actividad constante sin periodos de descanso o si el **SELF-ALIGNMENT MONITOR** reporta degradación sostenida.

## Contratos de Datos Clave
- **Purpose Seed**: texto estructurado con metas, valores y restricciones.
- **Narrativa del Yo (Self-Model)**: registro cronológico de decisiones, estados emocionales y cambios de propósito.
- **Estado Hormonal Digital**: niveles cuantitativos normalizados (0–1) para cada hormona AI.
- **Memoria**: entradas etiquetadas por tipo (episódica, semántica) y timestamp.
- **Registro de Intents**: catálogo versionado (vMajor.minor) con definición de cada `intent`, roles permitidos y políticas de visibilidad.
- **Esquema de Telemetría**: eventos `introspective_cycle`, `action_emitted`, `purpose_change` con campos `correlation_id`, `duration_ms`, `decision_outcome` y `risk_score`.

## Ciclo Introspectivo de Referencia
- **Intervalo sugerido**: cada 5–15 minutos en operación normal, ajustable por carga y criticidad del dominio.
- **Secuencia recomendada**:
  1. **Perception Gateway** recopila observaciones recientes.
  2. **Memory Manager** consolida contexto relevante (últimas decisiones, eventos críticos, indicadores hormonales).
  3. **Purpose Engine** ejecuta `evaluate_context` y devuelve señal de alineación/oportunidad.
  4. **Self-Reflector** y **Goal & Value Manager** validan coherencia con principios y metas.
  5. **Agency Engine** decide el modo de acción: pasivo, consultivo (A2A) o externo.
  6. **Action Scheduler** define canal y SLA; **Action Limiter** verifica permisos.
  7. **Action Justification** documenta la decisión; **Narrative Externalizer** puede generar un resumen humano.
  8. **Telemetry/Observability** envía métricas y eventos.
- **Condiciones de suspensión**: si el **CIRCADIAN MODULATOR** establece modo descanso o si el **IMPULSE CONTROL UNIT** detecta riesgo elevado.

## Configuración MVP Recomendada
- **Componentes mínimos**: CORTEX LLM + Purpose Engine + A2A Router + Memory Manager + Goal & Value Manager.
- **Persistencia**: base documental para memoria episódica/semántica; cola de mensajes para A2A (Kafka/NATS/Redis Streams).
- **Seguridad**: autenticación por agente (token o mTLS) y listas de intents permitidos por rol.
- **Recuperación ante fallos**: rehidratación de estado de propósito y memoria corta tras reinicio; reenvío de mensajes no confirmados con `correlation_id`.
- **Pruebas iniciales**: simulaciones de oportunidad (ineficiencia en proceso, alerta de seguridad) y verificación de que **Action Limiter** bloquea acciones fuera de propósito.

## Operación y Orquestación
- **Ciclos programados**: el Bucle Introspectivo puede ejecutarse cada _N_ minutos.
- **Escalabilidad**: despliegue distribuido; agentes pueden residir en distintos hosts pero compartir el protocolo A2A.
- **Herramientas MCP externas**: servidores MCP para memoria, planeamiento o análisis pueden declararse en la configuración de cada agente.
- **Seguridad y límites**: **Action Limiter** y **Impulse Control** protegen contra acciones no alineadas.

## Tablero de Métricas Sugerido
- **Alineación**: puntaje medio devuelto por **Purpose Engine** y **Self-Alignment Monitor**.
- **Proactividad**: número de acciones iniciadas sin solicitud externa por intervalo de tiempo.
- **Estabilidad**: varianza de estados hormonales digitales y frecuencia de bloqueos por **Impulse Control Unit**.
- **Eficiencia**: latencia promedio del bucle introspectivo y ratio de mensajes A2A exitosos vs. reintentos.
- **Evolución**: número de redefiniciones de propósito y cambios en la **Narrativa del Yo** por semana.

## Próximos Pasos Recomendados
- Documentación técnica detallada por módulo (interfaces, API y configuraciones).
- Pruebas de autoconciencia y simulaciones de aplicación industrial, educativa y médica.
- MVP funcional con CORTEX, Purpose Engine, A2A Router y Memory Manager integrados.
- Métricas de alineación y evolución del yo digital.
