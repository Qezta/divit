import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerateContentResponse } from '@google/genai';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  retrieve: vi.fn(() => 'Public portfolio context'),
  env: { GEMINI_API_KEY: 'test-only-placeholder' },
  constructor: vi.fn()
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      mocks.constructor(options);
    }
    models = { generateContentStream: mocks.generate };
  }
}));
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
vi.mock('$lib/utils/rag', () => ({ retrieveContext: mocks.retrieve }));

import { POST } from './+server';

const question = {
  messages: [{ role: 'user', content: 'What projects does Divit work on?' }]
};
const unavailable = 'The chat is temporarily unavailable. Please try again in a moment.';
const upstreamError = (status: number) =>
  Object.assign(new Error('private upstream URL and credential'), { status });
const chunk = (text?: string) => ({ text }) as GenerateContentResponse;
async function* chunks(...texts: string[]) {
  for (const text of texts) yield chunk(text);
}
function post(body: unknown = question, signal?: AbortSignal) {
  const request = new Request('https://example.test/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    signal
  });
  return POST({ request } as Parameters<typeof POST>[0]);
}
const pending = () => new Promise<never>(() => {});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.generate.mockReset();
  mocks.env.GEMINI_API_KEY = 'test-only-placeholder';
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('chat request validation', () => {
  it.each([
    null,
    {},
    { messages: [] },
    { messages: [null] },
    { messages: [{ role: 'system', content: 'Hello' }] },
    { messages: [{ role: 'user', content: 42 }] },
    { messages: [{ role: 'user', content: '  ' }] },
    { messages: [{ role: 'assistant', content: 'Hello' }] },
    { messages: [{ role: 'user', content: 'x'.repeat(10_001) }] },
    { messages: Array.from({ length: 101 }, () => question.messages[0]) }
  ])('rejects malformed messages before retrieval: %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON before retrieval', async () => {
    const request = new Request('https://example.test/api/chat', {
      method: 'POST',
      body: '{'
    });
    expect((await POST({ request } as Parameters<typeof POST>[0])).status).toBe(400);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it('returns a friendly 503 when unconfigured', async () => {
    mocks.env.GEMINI_API_KEY = '';
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: unavailable });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});

describe('chat generation', () => {
  it('streams text and DONE, preserving model, history mapping and context', async () => {
    mocks.generate.mockResolvedValue(chunks('', 'Hello', ' there'));
    const messages = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `message ${index}`
    }));
    const response = await post({ messages });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(await response.text()).toBe(
      'data: {"text":"Hello"}\n\ndata: {"text":" there"}\n\ndata: [DONE]\n\n'
    );
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    const options = mocks.generate.mock.calls[0][0];
    expect(options.model).toBe('gemini-3.8-flash');
    expect(options.config.httpOptions).toEqual({ timeout: 20_000 });
    expect(options.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(options.config.systemInstruction).toContain('divit@qezta.com');
    expect(options.config.systemInstruction).not.toContain('divitmittal@outlook.in');
    expect(options.config.systemInstruction).toContain('Public portfolio context');
    expect(options.contents).toHaveLength(20);
    expect(options.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'message 4' }]
    });
    expect(options.contents[1].role).toBe('model');
    expect(mocks.retrieve).toHaveBeenCalledWith('message 22');
    expect(options.config.abortSignal.aborted).toBe(true);
  });

  it.each([408, 429, 500, 502, 503, 504])('retries %i once before text', async (status) => {
    mocks.generate
      .mockRejectedValueOnce(upstreamError(status))
      .mockResolvedValueOnce(chunks('Recovered'));
    const result = post();
    await vi.advanceTimersByTimeAsync(250);
    const response = await result;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Recovered');
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });

  it('retries an iterator failure before text, including metadata-only chunks', async () => {
    mocks.generate
      .mockResolvedValueOnce(
        (async function* () {
          yield chunk();
          throw upstreamError(503);
        })()
      )
      .mockResolvedValueOnce(chunks('Recovered'));
    const result = post();
    await vi.advanceTimersByTimeAsync(250);
    expect(await (await result).text()).toContain('Recovered');
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });

  it('returns sanitized HTTP 503 after exhausting retries', async () => {
    mocks.generate.mockRejectedValue(upstreamError(503));
    const result = post();
    await vi.advanceTimersByTimeAsync(250);
    const response = await result;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: unavailable });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith('Chat generation failed', {
      status: 503,
      phase: 'before_stream'
    });
  });

  it.each([400, 401, 403, 404])('does not retry permanent upstream %i errors', async (status) => {
    mocks.generate.mockRejectedValue(upstreamError(status));
    const response = await post();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: unavailable });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('sanitizes unknown SDK errors without retrying', async () => {
    mocks.generate.mockRejectedValue(new Error('private upstream URL and credential'));
    const response = await post();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: unavailable });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty generation instead of reporting success', async () => {
    mocks.generate.mockResolvedValue(chunks(''));
    const response = await post();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: unavailable });
  });

  it('never retries after text, and emits only a sanitized SSE error', async () => {
    mocks.generate.mockResolvedValue(
      (async function* () {
        yield chunk('Partial');
        throw upstreamError(503);
      })()
    );
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      `data: {"text":"Partial"}\n\ndata: ${JSON.stringify({ error: unavailable })}\n\n`
    );
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it.each(['setup', 'first text', 'after text'])(
    'bounds a stalled SDK during %s',
    async (phase) => {
      mocks.generate.mockImplementation(() =>
        phase === 'setup'
          ? pending()
          : Promise.resolve({
              next: vi
                .fn()
                .mockImplementationOnce(() =>
                  phase === 'after text'
                    ? Promise.resolve({ done: false, value: chunk('Partial') })
                    : pending()
                )
                .mockImplementation(pending)
            })
      );
      const result = post();
      await vi.advanceTimersByTimeAsync(0);
      const response = phase === 'after text' ? await result : undefined;
      const text = response?.text();
      await vi.advanceTimersByTimeAsync(20_000);
      if (response) {
        expect(await text).toContain(JSON.stringify({ error: unavailable }));
        expect(await text).not.toContain('[DONE]');
      } else {
        const failure = await result;
        expect(failure.status).toBe(504);
        expect(await failure.json()).toEqual({ error: unavailable });
      }
      expect(mocks.generate.mock.calls[0][0].config.abortSignal.aborted).toBe(true);
      expect(mocks.generate).toHaveBeenCalledTimes(1);
    }
  );

  it('shares the deadline across retries', async () => {
    mocks.generate.mockRejectedValueOnce(upstreamError(503)).mockImplementation(pending);
    const result = post();
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await result).status).toBe(504);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending request without retrying', async () => {
    mocks.generate.mockImplementation(pending);
    const controller = new AbortController();
    const result = post(question, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    expect((await result).ok).toBe(false);
    expect(mocks.generate.mock.calls[0][0].config.abortSignal.aborted).toBe(true);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('does not start generation for an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    expect((await post(question, controller.signal)).ok).toBe(false);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('cancels during retry backoff and clears its timer', async () => {
    mocks.generate.mockRejectedValue(upstreamError(503));
    const controller = new AbortController();
    const result = post(question, controller.signal);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    expect((await result).ok).toBe(false);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('closes a stream when the request disconnects', async () => {
    mocks.generate.mockResolvedValue({
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk('Partial') })
        .mockImplementation(pending)
    });
    const controller = new AbortController();
    const response = await post(question, controller.signal);
    const text = response.text();
    controller.abort();
    expect(await text).toBe('data: {"text":"Partial"}\n\n');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0][0].config.abortSignal.aborted).toBe(true);
  });

  it('aborts upstream work when the response reader cancels', async () => {
    mocks.generate.mockResolvedValue({
      next: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk('Partial') })
        .mockImplementation(pending)
    });
    const response = await post();
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(mocks.generate.mock.calls[0][0].config.abortSignal.aborted).toBe(true);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});
