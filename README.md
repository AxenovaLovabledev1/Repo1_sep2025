# Front-end de chat estilo ChatGPT

Interfaz de chat construida con **Next.js 14 (App Router)** y **Tailwind CSS** que replica la experiencia de ChatGPT: sidebar con conversaciones persistidas, streaming de respuestas vía SSE, animación typewriter como _fallback_ y soporte para modo oscuro/claro.

## Características principales

- 🌙 **Tema oscuro por defecto** con alternancia a modo claro y persistencia en `localStorage`.
- 💬 **Sidebar completa** con botón "Nuevo chat", listado, renombrar, duplicar y borrar conversaciones.
- 🧠 **Streaming en tiempo real** mediante `EventSource` cuando el backend expone SSE.
- ⌨️ **Animación typewriter** automática cuando sólo hay endpoint REST.
- 🪄 **Render Markdown** con `react-markdown`, `remark-gfm` y `rehype-highlight`, más botón de "Copiar" en cada bloque de código.
- 📎 **Adjuntos de texto** (.txt/.md) por drag & drop o selector, mostrados como chips antes de enviar.
- 🔄 **Persistencia local** de conversaciones (id, título, timestamps, mensajes) en `localStorage`.
- 🛟 **Toasts de error** para fallos de red, timeouts o respuestas vacías, y opción de reintentar.
- ♿ **Accesible**: navegación por teclado, atajos (Ctrl/⌘+Enter para enviar, Escape para cancelar), `aria-labels` y foco visibles.

## Requisitos

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) ≥ 8

## Instalación y ejecución

```bash
pnpm install
pnpm dev
```

El servidor de desarrollo queda disponible en [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Crea un archivo `.env.local` a partir de `.env.local.example` y completa las URLs de tu backend:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_AGENT_SSE_URL=http://localhost:8000/stream
NEXT_PUBLIC_AGENT_CHAT_URL=http://localhost:8000/chat
```

- **`NEXT_PUBLIC_AGENT_SSE_URL`**: endpoint GET que emite SSE (`data: {"delta":"..."}` y un `{"done":true}` al final). Se invoca con `?conversationId=<id>`.
- **`NEXT_PUBLIC_AGENT_CHAT_URL`**: endpoint POST que recibe `{ conversationId, messages }`. Debe admitir dos escenarios:
  - *Modo streaming*: recibe el mismo payload (con cabecera `X-Chat-Stream: sse`) para preparar la conversación antes de abrir el SSE.
  - *Modo REST*: devuelve `{ reply: string }` cuando no hay streaming.

## Integración backend

1. **SSE**: el front envía primero un POST al endpoint REST para "preparar" la respuesta y luego abre un `EventSource` a `NEXT_PUBLIC_AGENT_SSE_URL?conversationId=<id>`.
2. **REST fallback**: si el SSE no está configurado o falla al iniciar, se hace sólo el POST y la respuesta se muestra con la animación typewriter (~45 cps).

Ejemplo rápido de respuesta SSE:

```
data: {"delta":"Hola"}

data: {"delta":" mundo"}

data: {"done":true}

```

Ejemplo de respuesta REST:

```json
{
  "reply": "Hola mundo"
}
```

## Estructura de carpetas

```
app/
  layout.tsx
  page.tsx
components/
  ChatInput.tsx
  ChatLayout.tsx
  ChatList.tsx
  ChatMessage.tsx
  Sidebar.tsx
  ThemeProvider.tsx
  ThemeToggle.tsx
  TypingDots.tsx
hooks/
  useChat.ts
  useLocalConversations.ts
  useTypewriter.ts
lib/
  chatClient.ts
  storage.ts
styles/
  globals.css
```

## Snippets destacados

### Streaming SSE + fallback REST (`hooks/useChat.ts`)

```ts
const session = await streamAssistant({
  request: { conversationId, messages: baseMessages },
  signal: controller.signal,
  onToken: (token) => {
    updateMessage(conversationId, assistantMessage.id, (message) => ({
      content: `${message.content}${token}`
    }));
  },
  onDone: () => finishStreaming(),
  onError: (error) => {
    if (!receivedTokens) {
      removeMessage(conversationId, assistantMessage.id);
    }
    pushToast(error.message, 'error');
    finishStreaming();
  }
});
...
const { reply } = await sendMessage({ conversationId, messages: baseMessages }, { signal: controller.signal });
updateMessage(conversationId, assistantMessage.id, () => ({ content: reply }));
setTypewriterState({ messageId: assistantMessage.id, text: reply, speed: 45 });
```

### Hook typewriter (`hooks/useTypewriter.ts`)

```ts
export function useTypewriter(text: string, speed = 45, active = true) {
  const [display, setDisplay] = useState(active ? '' : text);
  const [isFinished, setIsFinished] = useState(!active);

  useEffect(() => {
    if (!active) {
      setDisplay(text);
      setIsFinished(true);
      return;
    }

    setDisplay('');
    setIsFinished(false);
    const intervalMs = Math.max(16, Math.floor(1000 / speed));
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplay(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
        setIsFinished(true);
      }
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [active, speed, text]);

  const cancel = useCallback(() => {
    setDisplay(text);
    setIsFinished(true);
  }, [text]);

  return { display, isFinished, cancel };
}
```

### Botón de copiar en bloques de código (`components/ChatMessage.tsx`)

```tsx
const BlockCode = ({ className, children }: Props) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') ?? 'texto';
  const content = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border ...">
      <div className="flex items-center justify-between ...">
        <span>{language}</span>
        <button onClick={handleCopy}>
          <Copy className="h-3 w-3" /> {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto ...">
        <code>{content}</code>
      </pre>
    </div>
  );
};
```

## Scripts útiles

- `pnpm dev`: arranca el servidor de desarrollo.
- `pnpm build`: genera el build de producción.
- `pnpm start`: ejecuta el build.
- `pnpm lint`: corre ESLint.
- `pnpm type-check`: valida tipos con TypeScript.

## Notas adicionales

- El estado de conversaciones y la preferencia de tema se guardan en `localStorage` (`chat.conversations`, `chat.activeConversationId`, `chat.theme`).
- Adjuntos mayores a 200 KB o con extensiones distintas a `.txt`/`.md` se rechazan con un toast explicativo.
- Durante el streaming se puede cancelar con el botón **Detener** o presionando `Esc`.

¡Listo! Ajusta las URLs de backend y tendrás un front-end funcional listo para integrarse con tu agente conversacional.
