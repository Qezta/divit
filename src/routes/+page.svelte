<script>
  import Card from "@qezta/ui/components/organisms/Card.svelte";
  import Terminal from "$lib/components/Terminal.svelte";
</script>

<main class="portfolio">
  <Card sourceRepo="https://github.com/Qezta/divit" />
  <nav class="ssh-access" aria-label="SSH portfolio">
    <a href="ssh://divit@qezta.com">Explore the SSH portfolio</a>
    <code>ssh divit@qezta.com</code>
    <span>SSH access is being set up.</span>
  </nav>
</main>
<Terminal />

<style>
  .portfolio {
    min-width: 0;
    max-width: 100%;
  }

  @media (max-width: 768px) {
    /* Keep the tactile background when WebGL or motion is unavailable. */
    :global(body::after) {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0.055;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h180v180H0z'/%3E%3C/svg%3E");
    }

    :global(body) {
      background-color: var(--bg-color);
      padding: max(1rem, env(safe-area-inset-top))
        max(0.75rem, env(safe-area-inset-right))
        calc(6rem + env(safe-area-inset-bottom))
        max(0.75rem, env(safe-area-inset-left));
    }

    :global(body > div) {
      width: 100%;
      min-width: 0;
    }

    .portfolio :global(#card) {
      width: 100%;
      padding: 1.25rem;
      border: 1px solid #3a3a3a;
      border-radius: 0;
      background: rgb(13 13 13 / 88%);
      box-shadow: none;
    }

    .portfolio :global(#image img) {
      width: clamp(8rem, 30vw, 11rem);
    }

    .portfolio :global(h1) {
      font-size: clamp(1.5rem, 6vw, 2rem);
      letter-spacing: 0.08em;
      margin-block: 0.5rem;
    }

    .portfolio :global(#card-container) {
      gap: 1rem;
    }

    .portfolio :global(#molecules) {
      gap: 1.5rem;
    }

    .portfolio :global(section) {
      overflow-wrap: anywhere;
    }

    .portfolio :global(section a),
    .portfolio :global(.category-button) {
      min-height: 44px;
      box-sizing: border-box;
    }

    .portfolio :global(.social a) {
      display: inline-flex;
      align-items: center;
    }

    .portfolio :global(.social) {
      padding-block: 0;
    }

    .portfolio :global(section ul) {
      gap: 0.2rem;
    }

    .portfolio :global(.stats-grid) {
      grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
    }

    .portfolio :global(.stat-label) {
      font-size: 0.65rem;
      color: #aaa;
    }
  }

  @media (pointer: coarse) {
    :global(.touch-cursor) {
      display: none !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.pointer),
    :global(.touch-cursor) {
      display: none !important;
    }

    .portfolio :global(*),
    .portfolio :global(*::before),
    .portfolio :global(*::after) {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }

  .ssh-access {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem 1rem;
    max-width: 46rem;
    margin: 1rem auto 0;
    padding: 1rem;
    text-align: center;
    box-sizing: border-box;
  }

  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    text-decoration: underline;
  }

  a:focus-visible {
    outline: 2px solid var(--highlight);
    outline-offset: 4px;
    border-radius: 2px;
  }

  code {
    font-family: monospace;
    overflow-wrap: anywhere;
    user-select: text;
  }

  span {
    flex-basis: 100%;
    font-size: 0.85rem;
  }
</style>
