<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    executeCommand,
    type CommandResponse,
  } from "$lib/data/terminal-commands";

  interface HistoryEntry {
    input: string;
    output: string;
    isError: boolean;
  }

  let input = "";
  let history: HistoryEntry[] = [];
  let commandHistory: string[] = [];
  let historyIndex = -1;
  let terminalElement: HTMLDivElement;
  let inputElement: HTMLInputElement;
  let isVisible = false;
  let toggleElement: HTMLButtonElement;
  let panelElement: HTMLDivElement;

  onMount(() => {
    // Show welcome message
    history = [
      {
        input: "",
        output: `divit / portfolio

help   available commands
about  background & experience`,
        isError: false,
      },
    ];
  });

  function handleSubmit() {
    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    // Execute command
    const result: CommandResponse = executeCommand(trimmedInput);

    // Special handling for clear command
    if (result.output === "__CLEAR__") {
      history = [];
      input = "";
      return;
    }

    // Special handling for resume command - open Europass CV in new tab
    if (trimmedInput === "resume") {
      window.open(
        "https://europa.eu/europass/eportfolio/screen/share/33683761-9b95-4b23-8184-fa65f7a14e06?lang=en",
        "_blank",
      );
    }

    // Add to history
    history = [
      ...history,
      {
        input: trimmedInput,
        output: result.output,
        isError: result.isError || false,
      },
    ];

    // Add to command history
    commandHistory = [...commandHistory, trimmedInput];
    historyIndex = commandHistory.length;

    // Clear input
    input = "";

    // Scroll to bottom
    setTimeout(() => {
      if (terminalElement) {
        terminalElement.scrollTop = terminalElement.scrollHeight;
      }
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Arrow up - previous command
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input = commandHistory[historyIndex];
      }
    }

    // Arrow down - next command
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input = "";
      }
    }
  }

  function focusInput() {
    inputElement?.focus();
  }

  async function toggleTerminal() {
    isVisible = !isVisible;
    if (isVisible) {
      window.dispatchEvent(
        new CustomEvent("portfolio-panel", { detail: "terminal" }),
      );
      await tick();
      // Avoid raising a software keyboard until a touch user selects the input.
      if (window.matchMedia("(pointer: fine)").matches) focusInput();
      else panelElement?.focus();
    } else {
      toggleElement?.focus();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (isVisible && event.key === "Escape") {
      event.preventDefault();
      toggleTerminal();
    }
  }

  onMount(() => {
    const closeOtherPanel = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== "terminal")
        isVisible = false;
    };
    window.addEventListener("portfolio-panel", closeOtherPanel);
    return () => window.removeEventListener("portfolio-panel", closeOtherPanel);
  });

  function linkifyUrls(text: string): { text: string; href?: string }[] {
    const pattern =
      /https?:\/\/[^\s<>"']+|\b[\w.+%-]+@[\w.-]+\.[a-z]{2,}\b|\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/gi;
    const segments: { text: string; href?: string }[] = [];
    let index = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (start > index) segments.push({ text: text.slice(index, start) });
      const value = match[0];
      const href =
        value.includes("@") && !/^https?:\/\//i.test(value)
          ? `mailto:${value}`
          : /^https?:\/\//i.test(value)
            ? value
            : `https://${value}`;
      segments.push({ text: value, href });
      index = start + value.length;
    }
    if (index < text.length) segments.push({ text: text.slice(index) });
    return segments;
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<!-- Terminal Toggle Button -->
<button
  class="terminal-toggle"
  class:open={isVisible}
  bind:this={toggleElement}
  on:click={toggleTerminal}
  aria-label={isVisible ? "Close terminal" : "Open terminal"}
  aria-expanded={isVisible}
  aria-controls="portfolio-terminal"
>
  <span class="terminal-icon">&gt;_</span>
  <span class="terminal-label">terminal</span>
</button>

<!-- Terminal Window -->
{#if isVisible}
  <div
    class="terminal-container"
    id="portfolio-terminal"
    role="dialog"
    aria-labelledby="terminal-title"
    tabindex="-1"
    bind:this={panelElement}
  >
    <div class="terminal-header">
      <div class="terminal-title" id="terminal-title">
        terminal <span>/ divit</span>
      </div>
      <button
        class="terminal-close"
        on:click={toggleTerminal}
        aria-label="Close Terminal"
      >
        ✕
      </button>
    </div>

    <div
      class="terminal-content"
      bind:this={terminalElement}
      role="log"
      aria-live="polite"
    >
      {#each history as entry, index (index)}
        {#if entry.input}
          <div class="terminal-prompt">
            <span class="prompt-symbol">$</span>
            <span class="prompt-input">{entry.input}</span>
          </div>
        {/if}
        {#if entry.output}
          <!-- Links are restricted to external HTTP(S) and mailto URLs by linkifyUrls. -->
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <pre
            class="terminal-output"
            class:error={entry.isError}>{#each linkifyUrls(entry.output) as segment, index (index)}{#if segment.href}<a
                  class="terminal-link"
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer">{segment.text}</a
                >{:else}{segment.text}{/if}{/each}</pre>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/if}
      {/each}

      <!-- Current input line -->
      <div class="terminal-prompt">
        <span class="prompt-symbol">$</span>
        <input
          bind:this={inputElement}
          bind:value={input}
          on:keydown={handleKeyDown}
          on:keydown={(e) => e.key === "Enter" && handleSubmit()}
          class="terminal-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          aria-label="Terminal input"
        />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .terminal-toggle,
  .terminal-toggle :global(*),
  .terminal-container,
  .terminal-container :global(*) {
    box-sizing: border-box;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  }

  .terminal-toggle {
    position: fixed;
    bottom: calc(20px + env(safe-area-inset-bottom));
    right: calc(132px + env(safe-area-inset-right));
    z-index: 1000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid #777;
    border-radius: 0;
    background: #090909;
    color: #f5f5f5;
    font-size: 12px;
    cursor: pointer;
  }

  .terminal-icon {
    color: #ff477f;
  }
  .terminal-label {
    color: inherit;
  }
  .terminal-toggle:hover,
  .terminal-toggle.open {
    border-color: #f5f5f5;
    background: #222;
  }

  button:focus-visible,
  .terminal-input:focus-visible {
    outline: 2px solid #ff477f;
    outline-offset: 3px;
  }

  .terminal-container {
    position: fixed;
    bottom: calc(76px + env(safe-area-inset-bottom));
    right: calc(20px + env(safe-area-inset-right));
    z-index: 999;
    display: flex;
    flex-direction: column;
    width: 640px;
    max-width: calc(
      100vw - 40px - env(safe-area-inset-left) - env(safe-area-inset-right)
    );
    height: 480px;
    max-height: calc(
      100dvh - 96px - env(safe-area-inset-bottom) - env(safe-area-inset-top)
    );
    border: 1px solid #777;
    border-radius: 0;
    background: #090909;
    color: #eee;
  }

  .terminal-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding-left: 16px;
    border-bottom: 1px solid #444;
  }

  .terminal-title {
    color: #f5f5f5;
    font-size: 12px;
  }
  .terminal-title span {
    color: #a3a3a3;
  }
  .terminal-close {
    min-width: 48px;
    min-height: 48px;
    border: 0;
    background: transparent;
    color: #eee;
    font-size: 18px;
    cursor: pointer;
  }
  .terminal-close:hover {
    background: #222;
  }
  .terminal-content {
    flex: 1;
    min-height: 0;
    padding: 20px;
    overflow: auto;
    overscroll-behavior: contain;
    font-size: 13px;
    line-height: 1.65;
  }
  .terminal-content :global(*) {
    user-select: text;
  }
  .terminal-prompt {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }
  .prompt-symbol {
    flex-shrink: 0;
    color: #ff477f;
  }
  .prompt-input {
    color: #fff;
    overflow-wrap: anywhere;
  }
  .terminal-input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 16px;
    caret-color: #ff477f;
  }
  .terminal-output {
    margin: 0 0 20px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: #ddd;
    font-size: inherit;
    line-height: inherit;
  }
  .terminal-output.error {
    color: #ff829e;
  }
  .terminal-output :global(.terminal-link) {
    color: #ff829e;
    text-decoration: underline;
  }
  .terminal-output :global(.terminal-link:focus-visible) {
    outline: 2px solid #ff477f;
    outline-offset: 3px;
  }

  @media (max-width: 600px) {
    .terminal-toggle {
      bottom: calc(12px + env(safe-area-inset-bottom));
      right: calc(112px + env(safe-area-inset-right));
      padding: 0 10px;
      gap: 8px;
    }
    .terminal-container {
      right: calc(12px + env(safe-area-inset-right));
      bottom: calc(68px + env(safe-area-inset-bottom));
      max-width: calc(
        100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)
      );
      max-height: calc(
        100dvh - 80px - env(safe-area-inset-bottom) - env(safe-area-inset-top)
      );
    }
    .terminal-content {
      padding: 16px;
    }
  }
</style>
