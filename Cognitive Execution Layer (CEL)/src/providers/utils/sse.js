export function* parseSSELines(textChunk, state = { buffer: '' }) {
  state.buffer += textChunk;
  const lines = state.buffer.split('\n');
  state.buffer = lines.pop() || '';

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (!line.startsWith('data:')) continue;

    const data = line.slice(5).trimStart();
    if (!data) continue;
    if (data === '[DONE]') {
      yield { done: true };
      continue;
    }

    yield { done: false, data };
  }
}

export async function* sseResponseToAsyncIterator(response) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    throw new Error('Streaming response body is not readable');
  }

  const decoder = new TextDecoder();
  const state = { buffer: '' };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const evt of parseSSELines(chunk, state)) {
      if (evt.done) return;
      yield evt.data;
    }
  }
}
