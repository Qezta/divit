<script>
  import "$lib/styles/portfolio.css";
  import Card from "@qezta/ui/components/organisms/Card.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Terminal from "$lib/components/Terminal.svelte";
</script>

<main class="portfolio">
  <Card sourceRepo="https://github.com/Qezta/divit" />
</main>
<SiteFooter />
<Terminal />

<style>
  .portfolio {
    min-width: 0;
    max-width: 100%;
  }

  /* This tile is a captured frame of cursor_trail_fragment.glsl's grain,
     used only when a WebGL context cannot be created. */
  :global(body.portfolio-static::before) {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: #000 var(--shader-grain) repeat;
    background-size: 256px 256px;
  }

  @media (max-width: 768px) {
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
</style>
