/**
 * Server-Sent Events (SSE) Utilities
 * Helper functions for parsing SSE streams
 */

export interface SSEChunk {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

/**
 * Parse SSE lines into structured chunks
 * @param lines - Raw SSE lines
 * @returns Array of parsed SSE chunks
 */
export function parseSSELines(lines: string[]): SSEChunk[] {
  const chunks: SSEChunk[] = [];
  let currentChunk: Partial<SSEChunk> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line indicates end of chunk
      if (currentChunk.data !== undefined) {
        chunks.push({
          id: currentChunk.id,
          event: currentChunk.event,
          data: currentChunk.data,
          retry: currentChunk.retry,
        });
        currentChunk = {};
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    let field: string;
    let value: string;

    if (colonIndex === -1) {
      field = trimmed;
      value = '';
    } else if (colonIndex === 0) {
      field = '';
      value = trimmed.slice(1).trim();
    } else {
      field = trimmed.slice(0, colonIndex);
      value = trimmed.slice(colonIndex + 1).trim();
    }

    switch (field) {
      case 'id':
        currentChunk.id = value;
        break;
      case 'event':
        currentChunk.event = value;
        break;
      case 'data':
        currentChunk.data = (currentChunk.data || '') + (value ? (currentChunk.data ? '\n' : '') + value : '');
        break;
      case 'retry':
        currentChunk.retry = parseInt(value, 10);
        break;
    }
  }

  return chunks;
}

/**
 * Convert SSE response stream to async iterator
 * @param response - Fetch Response with SSE stream
 * @returns Async iterator of SSE chunks
 */
export async function* sseResponseToAsyncIterator(response: Response): AsyncGenerator<SSEChunk> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    const chunks = parseSSELines(lines);
    for (const chunk of chunks) {
      yield chunk;
    }
  }
}
