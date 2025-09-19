import { Message } from '@/types/chat';

export interface ChatRequest {
  conversationId: string;
  messages: Message[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface StreamAssistantParams extends StreamCallbacks {
  request: ChatRequest;
  signal?: AbortSignal;
}

const CHAT_URL = process.env.NEXT_PUBLIC_AGENT_CHAT_URL;
const SSE_URL = process.env.NEXT_PUBLIC_AGENT_SSE_URL;

const createError = (message: string, cause?: unknown) => {
  const error = new Error(message);
  if (cause instanceof Error && 'cause' in error) {
    (error as Error & { cause?: unknown }).cause = cause;
  }
  return error;
};

export async function sendMessage(
  request: ChatRequest,
  options: { signal?: AbortSignal } = {}
): Promise<{ reply: string }> {
  if (!CHAT_URL) {
    throw new Error('NEXT_PUBLIC_AGENT_CHAT_URL no está configurado.');
  }

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request),
    signal: options.signal
  });

  if (!response.ok) {
    throw createError(`Error de red (${response.status}) al enviar el mensaje.`);
  }

  const data = (await response.json()) as { reply?: string };

  if (typeof data.reply !== 'string') {
    throw createError('La respuesta del asistente está vacía.');
  }

  return { reply: data.reply };
}

export async function streamAssistant({
  request,
  onToken,
  onDone,
  onError,
  signal
}: StreamAssistantParams): Promise<{ cancel: () => void }> {
  if (!SSE_URL) {
    throw new Error('NEXT_PUBLIC_AGENT_SSE_URL no está configurado.');
  }

  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  if (CHAT_URL) {
    await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Chat-Stream': 'sse'
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal
    });
  }

  return new Promise((resolve, reject) => {
    const url = new URL(SSE_URL);
    url.searchParams.set('conversationId', request.conversationId);

    const eventSource = new EventSource(url.toString());
    let resolved = false;

    const cancel = () => {
      eventSource.close();
      controller.abort();
    };

    const handleError = (reason: Error) => {
      cancel();
      if (!resolved) {
        reject(reason);
      }
      onError(reason);
    };

    eventSource.onopen = () => {
      resolved = true;
      resolve({ cancel });
    };

    eventSource.onmessage = (event) => {
      const payload = event.data;
      if (!payload) {
        return;
      }

      if (payload === '[DONE]') {
        cancel();
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(payload) as { delta?: string; done?: boolean };
        if (parsed.done) {
          cancel();
          onDone();
          return;
        }

        if (typeof parsed.delta === 'string') {
          onToken(parsed.delta);
        }
      } catch (_error) {
        onToken(payload);
      }
    };

    eventSource.onerror = () => {
      handleError(createError('Error en la conexión SSE.'));
    };

    if (controller.signal.aborted) {
      handleError(createError('Streaming cancelado.'));
    }
  });
}
