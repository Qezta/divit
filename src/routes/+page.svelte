<script>
  import Card from "@qezta/ui/components/organisms/Card.svelte";
  import Terminal from "$lib/components/Terminal.svelte";
</script>

<Card sourceRepo="https://github.com/Qezta/divit" />
<nav class="ssh-access" aria-label="SSH portfolio">
  <a href="ssh://divit@qezta.com">Explore the SSH portfolio</a>
  <code>ssh divit@qezta.com</code>
  <span>SSH access is being set up.</span>
</nav>
<Terminal />

<style>
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
