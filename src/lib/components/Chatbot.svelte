<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
  }

  const suggestions = ['Projects', 'Experience', 'Skills', 'Contact'];
  let isOpen = false;
  let messages: Message[] = [];
  let inputValue = '';
  let isLoading = false;
  let hasError = false;
  let messagesElement: HTMLDivElement;
  let inputElement: HTMLTextAreaElement;
  let toggleElement: HTMLButtonElement;
  let panelElement: HTMLDivElement;

  async function toggleOpen() {
    isOpen = !isOpen;
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('portfolio-panel', { detail: 'chat' }));
      await tick();
      // Touch users can read the panel before choosing to raise the keyboard.
      if (window.matchMedia('(pointer: fine)').matches) inputElement?.focus();
      else panelElement?.focus();
    } else {
      toggleElement?.focus();
    }
  }

  onMount(() => {
    const closeOtherPanel = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== 'chat') isOpen = false;
    };
    window.addEventListener('portfolio-panel', closeOtherPanel);
    return () => window.removeEventListener('portfolio-panel', closeOtherPanel);
  });

  function handleWindowKeydown(event: KeyboardEvent) {
    if (isOpen && event.key === 'Escape') {
      event.preventDefault();
      toggleOpen();
    }
  }

  async function scrollToBottom() {
    await tick();
    if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  async function sendMessage(content: string) {
    const text = content.trim();
    if (!text || isLoading) return;
    hasError = false;
    inputValue = '';
    messages = [...messages, { role: 'user', content: text }];
    isLoading = true;
    messages = [...messages, { role: 'assistant', content: '', streaming: true }];
    await scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(0, -1).map(({ role, content }) => ({ role, content }))
        })
      });
      if (!response.ok || !response.body) throw new Error('Chat unavailable');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let complete = false;
      try {
        while (!complete) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = done ? '' : (lines.pop() ?? '');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              complete = true;
              break;
            }
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error('Chat unavailable');
            if (typeof parsed.text === 'string') {
              messages[messages.length - 1].content += parsed.text;
              messages = messages;
              await scrollToBottom();
            }
          }
          if (done) break;
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      if (!messages[messages.length - 1].content) throw new Error('Empty response');
    } catch {
      hasError = true;
      messages[messages.length - 1].content = 'Chat unavailable. Try again in a moment.';
      messages = messages;
    } finally {
      messages[messages.length - 1].streaming = false;
      messages = messages;
      isLoading = false;
      await scrollToBottom();
    }
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage(inputValue);
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<button
  class="chat-toggle"
  class:open={isOpen}
  bind:this={toggleElement}
  on:click={toggleOpen}
  aria-label={isOpen ? 'Close chat' : 'Open chat about Divit'}
  aria-expanded={isOpen}
  aria-controls="portfolio-chat"
>
  <span class="chat-symbol" aria-hidden="true">↗</span>
  <span>ask divit</span>
</button>

{#if isOpen}
  <div
    class="chat-panel"
    id="portfolio-chat"
    role="dialog"
    aria-labelledby="chat-title"
    tabindex="-1"
    bind:this={panelElement}
  >
    <div class="chat-header">
      <h2 id="chat-title">ask divit <span>/ AI assistant</span></h2>
      <button class="close-button" on:click={toggleOpen} aria-label="Close chat">✕</button>
    </div>

    <div
      class="messages"
      bind:this={messagesElement}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {#if messages.length === 0}
        <div class="empty-state">
          <p class="intro">What would you like to know?</p>
          <p class="hint">Projects, work, and ways to get in touch.</p>
          <div class="suggestions">
            {#each suggestions as suggestion (suggestion)}
              <button
                on:click={() => sendMessage(`Tell me about Divit's ${suggestion.toLowerCase()}.`)}
              >
                <span>{suggestion}</span><span aria-hidden="true">↗</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        {#each messages as message, i (i)}
          <div class="message" class:user={message.role === 'user'}>
            <div class="message-label">
              {message.role === 'user' ? 'you' : 'assistant'}
            </div>
            <div class="message-content">
              {#if message.streaming && !message.content}
                <span class="pending">Thinking…</span>
              {:else}
                {message.content}
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if hasError}
      <div class="error" role="alert">
        Your question is saved. <button
          on:click={() => {
            const question = messages[messages.length - 2]?.content;
            if (!question) return;
            messages = messages.slice(0, -2);
            sendMessage(question);
          }}>Retry</button
        >
      </div>
    {/if}

    <form class="input-area" on:submit|preventDefault={() => sendMessage(inputValue)}>
      <textarea
        bind:this={inputElement}
        bind:value={inputValue}
        on:keydown={handleInputKeydown}
        placeholder="Your question…"
        aria-label="Your question about Divit"
        rows="2"
        maxlength="10000"
        readonly={isLoading}
      ></textarea>
      <button
        class="send-button"
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        aria-label="Send question">↵</button
      >
    </form>
    <p class="disclosure">AI responses can be inaccurate.</p>
  </div>
{/if}

<style lang="scss">
  .chat-toggle,
  .chat-panel,
  .chat-panel :global(*) {
    box-sizing: border-box;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  }
  .chat-toggle {
    position: fixed;
    bottom: calc(20px + env(safe-area-inset-bottom));
    right: calc(20px + env(safe-area-inset-right));
    z-index: 1000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 44px;
    width: 100px;
    padding: 0 12px;
    border: 1px solid #777;
    border-radius: 0;
    background: #090909;
    color: #f5f5f5;
    font-size: 12px;
    cursor: pointer;
  }
  .chat-symbol {
    color: #ff477f;
    font-size: 18px;
  }
  .chat-toggle span {
    color: inherit;
  }
  .chat-toggle .chat-symbol {
    color: #ff477f;
  }
  .chat-toggle:hover,
  .chat-toggle.open {
    border-color: #f5f5f5;
    background: #222;
  }
  button:focus-visible,
  textarea:focus-visible {
    outline: 2px solid #ff477f;
    outline-offset: 3px;
  }
  .chat-panel {
    position: fixed;
    bottom: calc(76px + env(safe-area-inset-bottom));
    right: calc(20px + env(safe-area-inset-right));
    z-index: 999;
    display: flex;
    flex-direction: column;
    width: 400px;
    max-width: calc(100vw - 40px - env(safe-area-inset-left) - env(safe-area-inset-right));
    height: 520px;
    max-height: calc(100dvh - 96px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
    border: 1px solid #777;
    border-radius: 0;
    background: #090909;
    color: #eee;
  }
  .chat-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding-left: 16px;
    border-bottom: 1px solid #444;
  }
  h2 {
    margin: 0;
    color: #f5f5f5;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
  }
  h2 span {
    color: #a3a3a3;
  }
  .close-button {
    min-width: 48px;
    min-height: 48px;
    border: 0;
    background: transparent;
    color: #eee;
    font-size: 18px;
    cursor: pointer;
  }
  .close-button:hover {
    background: #222;
  }
  .messages {
    flex: 1;
    min-height: 0;
    padding: 20px 16px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .intro {
    margin: 0 0 8px;
    color: #eee;
    font-size: 14px;
    line-height: 1.5;
  }
  .hint {
    margin: 0 0 24px;
    color: #b3b3b3;
    font-size: 12px;
    line-height: 1.6;
  }
  .suggestions {
    display: flex;
    flex-direction: column;
  }
  .suggestions button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    padding: 0 8px;
    border: 0;
    border-bottom: 1px solid #444;
    border-radius: 0;
    background: transparent;
    color: #ddd;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }
  .suggestions button:hover {
    background: #222;
  }
  .suggestions button span:last-child {
    color: #ff477f;
  }
  .message {
    padding: 16px 0;
    border-bottom: 1px solid #333;
  }
  .message:first-child {
    padding-top: 0;
  }
  .message-label {
    margin-bottom: 8px;
    color: #aaa;
    font-size: 11px;
  }
  .user .message-label {
    color: #ff829e;
  }
  .message-content {
    color: #eee;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .pending {
    color: #aaa;
  }
  .input-area {
    display: flex;
    flex-shrink: 0;
    align-items: flex-end;
    gap: 8px;
    padding: 12px;
    margin: 0;
    border-top: 1px solid #444;
  }
  textarea {
    flex: 1;
    min-width: 0;
    min-height: 48px;
    max-height: 120px;
    padding: 10px;
    border: 1px solid #666;
    border-radius: 0;
    background: #111;
    color: #eee;
    font-size: 16px;
    line-height: 1.5;
    resize: vertical;
    user-select: text;
  }
  textarea::placeholder {
    color: #aaa;
  }
  .send-button {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid #eee;
    border-radius: 0;
    background: #eee;
    color: #090909;
    font-size: 22px;
    cursor: pointer;
  }
  .send-button:hover:not(:disabled) {
    background: #ff829e;
    border-color: #ff829e;
  }
  .send-button:disabled {
    border-color: #444;
    background: #222;
    color: #888;
    cursor: default;
  }
  .error {
    padding: 8px 16px;
    color: #ff829e;
    font-size: 12px;
    line-height: 1.6;
  }
  .error button {
    min-height: 44px;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: #eee;
    text-decoration: underline;
    cursor: pointer;
  }
  .disclosure {
    margin: 0 12px 12px;
    color: #a3a3a3;
    font-size: 10px;
  }
  @media (max-width: 600px) {
    .chat-toggle {
      bottom: calc(12px + env(safe-area-inset-bottom));
      right: calc(12px + env(safe-area-inset-right));
      width: 92px;
      padding: 0 8px;
      gap: 8px;
    }
    .chat-panel {
      right: calc(12px + env(safe-area-inset-right));
      bottom: calc(68px + env(safe-area-inset-bottom));
      max-width: calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right));
      max-height: calc(100dvh - 80px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
    }
  }
</style>
