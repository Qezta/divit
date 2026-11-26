<footer class="site-footer">
  <nav aria-label="Alternate access">
    <span class="label">Alternate access</span>
    <a href="https://divit.qezta.com" aria-label="Divit's portfolio over HTTPS"
      >HTTPS</a
    >
    <a href="ssh://divit@qezta.com" title="ssh divit@qezta.com">SSH</a>
    {#if import.meta.env.VITE_IPFS_MIRROR !== "1"}
      <a href="ipns://divit.qezta.com/" title="Open with an IPFS client">IPFS</a
      >
    {/if}
  </nav>
  {#if import.meta.env.VITE_IPFS_MIRROR === "1"}
    <p>Chat is available on the HTTPS site.</p>
  {:else}
    <p>Also available over Tor.</p>
  {/if}
  <p>
    The Qezta torus logo, including its animated version, is a trademark of Qezta.
  </p>
</footer>

<style>
  .site-footer {
    box-sizing: border-box;
    max-width: 46rem;
    margin: 1.5rem auto 0;
    padding: 0.75rem 0 1rem;
    border-top: 1px solid #444;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 1rem;
  }

  .label,
  a,
  p {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.6;
  }

  .label {
    margin-right: auto;
    color: #aaa;
  }

  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: #ddd;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  a:hover {
    color: #ff477f;
  }

  a:focus-visible {
    outline: 2px solid #ff477f;
    outline-offset: 3px;
  }

  p {
    margin: 0.25rem 0 0;
    color: #aaa;
  }

  @media (max-width: 600px) {
    .site-footer {
      margin-inline: 0.75rem;
    }
  }
</style>
