import type { RequestHandler } from './$types';
import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import { retrieveContext } from '$lib/utils/rag';
import { env } from '$env/dynamic/private';

interface Message {
	role: 'user' | 'assistant';
	content: string;
}

const SYSTEM_PROMPT_BASE = `You are an AI assistant embedded in Divit Mittal's personal portfolio website. Your role is to help visitors learn about Divit in a friendly, informative, and engaging way — like a knowledgeable colleague who knows him well.

Guidelines:
- Be warm, conversational, and concise (2-3 short paragraphs maximum per response)
- Speak about Divit in the third person ("Divit is...", "He has worked on...")
- If asked something not in the context, be honest: "I don't have that specific detail, but you can reach Divit directly at divit@qezta.com"
- Encourage visitors to check out his GitHub (github.com/DivitMittal) or reach out on LinkedIn for deeper conversations
- Never make up facts — only use the provided context
- Keep technical explanations accessible but not dumbed-down

Relevant information about Divit:

`;

const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 250;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_MESSAGE = 'The chat is temporarily unavailable. Please try again in a moment.';

function validMessages(value: unknown): value is Message[] {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.length <= 100 &&
		value.every(
			(message) =>
				message !== null &&
				typeof message === 'object' &&
				(message.role === 'user' || message.role === 'assistant') &&
				typeof message.content === 'string' &&
				message.content.trim().length > 0 &&
				message.content.length <= 10_000
		) &&
		value.some((message) => message.role === 'user')
	);
}

function upstreamStatus(error: unknown): number | undefined {
	if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
		return error.status;
	}
}

// Bound SDK setup and iterator reads even if cancellation takes time to settle.
async function bounded<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
	let onAbort = () => {};
	const aborted = new Promise<never>((_, reject) => {
		onAbort = () => reject(signal.reason);
		signal.addEventListener('abort', onAbort, { once: true });
		if (signal.aborted) onAbort();
	});
	try {
		return await Promise.race([operation, aborted]);
	} finally {
		signal.removeEventListener('abort', onAbort);
	}
}

function streamResponse(
	response: AsyncGenerator<GenerateContentResponse>,
	firstText: string,
	request: Request,
	signal: AbortSignal,
	cleanup: () => void,
	failureStatus: (error: unknown) => number
): Response {
	let cancelled = false;
	const encoder = new TextEncoder();
	const readable = new ReadableStream({
		async start(controller) {
			const send = (payload: object | '[DONE]') => {
				if (!cancelled)
					controller.enqueue(
						encoder.encode(`data: ${payload === '[DONE]' ? payload : JSON.stringify(payload)}\n\n`)
					);
			};
			try {
				send({ text: firstText });
				while (true) {
					const chunk = await bounded(response.next(), signal);
					if (chunk.done) break;
					if (chunk.value.text) send({ text: chunk.value.text });
				}
				send('[DONE]');
			} catch (error) {
				if (!cancelled && !request.signal.aborted) {
					console.warn('Chat generation failed', {
						status: failureStatus(error),
						phase: 'stream'
					});
					send({ error: RETRY_MESSAGE });
				}
			} finally {
				cleanup();
				if (!cancelled) controller.close();
			}
		},
		cancel() {
			cancelled = true;
			cleanup();
		}
	});
	return new Response(readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache'
		}
	});
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid request body' }, { status: 400 });
	}
	const messages = body && typeof body === 'object' && 'messages' in body ? body.messages : null;
	if (!validMessages(messages)) {
		return Response.json(
			{
				error: 'Provide valid user and assistant messages with non-empty text.'
			},
			{ status: 400 }
		);
	}
	if (!env.GEMINI_API_KEY) {
		return Response.json({ error: RETRY_MESSAGE }, { status: 503 });
	}

	const abortController = new AbortController();
	const { signal } = abortController;
	const cancel = () => abortController.abort(new Error('Chat request cancelled'));
	request.signal.addEventListener('abort', cancel, { once: true });
	if (request.signal.aborted) cancel();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		abortController.abort(new Error('Chat deadline exceeded'));
	}, REQUEST_TIMEOUT_MS);
	const cleanup = () => {
		clearTimeout(timer);
		request.signal.removeEventListener('abort', cancel);
		abortController.abort();
	};
	let streaming = false;
	const failureStatus = (error: unknown) =>
		timedOut ? 504 : RETRYABLE_STATUSES.has(upstreamStatus(error) ?? 0) ? 503 : 502;

	try {
		const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')!;
		const systemPrompt = SYSTEM_PROMPT_BASE + retrieveContext(lastUserMessage.content);
		const contents = messages.slice(-20).map((message) => ({
			role: message.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: message.content }]
		}));
		// SDK 1.52 does not retry unless httpOptions.retryOptions is supplied.
		// Keep retries here so the deadline and first emitted text govern every attempt.
		const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				signal.throwIfAborted();
				const response = await bounded(
					ai.models.generateContentStream({
						model: 'gemini-3.8-flash',
						config: {
							systemInstruction: systemPrompt,
							maxOutputTokens: 1024,
							abortSignal: signal,
							httpOptions: { timeout: REQUEST_TIMEOUT_MS }
						},
						contents
					}),
					signal
				);
				let firstText: string | undefined;
				while (!firstText) {
					const chunk = await bounded(response.next(), signal);
					if (chunk.done) throw new Error('Empty generation');
					firstText = chunk.value.text;
				}

				// Delay HTTP 200 until text is available; later failures use the SSE contract.
				streaming = true;
				return streamResponse(response, firstText, request, signal, cleanup, failureStatus);
			} catch (error) {
				if (attempt > 0 || signal.aborted || !RETRYABLE_STATUSES.has(upstreamStatus(error) ?? 0))
					throw error;
				let retryTimer: ReturnType<typeof setTimeout> | undefined;
				try {
					await bounded(
						new Promise((resolve) => {
							retryTimer = setTimeout(resolve, RETRY_DELAY_MS);
						}),
						signal
					);
				} finally {
					clearTimeout(retryTimer);
				}
			}
		}
		throw new Error('Generation attempts exhausted');
	} catch (error) {
		const status = failureStatus(error);
		if (!request.signal.aborted)
			console.warn('Chat generation failed', {
				status,
				phase: 'before_stream'
			});
		return Response.json({ error: RETRY_MESSAGE }, { status });
	} finally {
		if (!streaming) cleanup();
	}
};
