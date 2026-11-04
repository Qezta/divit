<div id="top">
    <div align="center">
  <h1 align='center'>divit.qezta.com</h1>
  <strong>Personal portfolio site for Divit Mittal with a RAG-powered digital avatar.</strong>
    </div>
</div>

---

<div align='center'>
    <a href="https://divit.qezta.com/">
  <img src="https://img.shields.io/badge/site-divit.qezta.com-orange?style=for-the-badge&logo=svelte&logoColor=white" alt="site" />
    </a>
    <a href="https://github.com/Qezta/divit/blob/main/LICENSE">
  <img src="https://img.shields.io/badge/license-HONCL--1.0-orange?style=for-the-badge&logo=unlicense&logoColor=white" alt="license"/>
    </a>
    <a href="https://svelte.dev/">
  <img src="https://img.shields.io/badge/SvelteKit-Vercel-orange?style=for-the-badge&logo=svelte&logoColor=white" alt="sveltekit"/>
    </a>
    <img src="https://img.shields.io/badge/language-TypeScript-orange?style=for-the-badge&logo=typescript&logoColor=white" alt="repo-top-language"/>
</div>

---

<div align='center'>
    <a href="https://github.com/Qezta/divit/actions/workflows/flake-check.yml">
  <img src="https://github.com/Qezta/divit/actions/workflows/flake-check.yml/badge.svg" alt="nix-flake-check"/>
    </a>
    <a href="https://github.com/Qezta/divit/actions/workflows/gen-sitemap.yml">
  <img src="https://github.com/Qezta/divit/actions/workflows/gen-sitemap.yml/badge.svg" alt="gen-sitemap"/>
    </a>
    <a href="https://github.com/Qezta/divit/actions/workflows/flake-lock-update.yml">
  <img src="https://github.com/Qezta/divit/actions/workflows/flake-lock-update.yml/badge.svg" alt="nix-flake-lock-update"/>
    </a>
</div>

---

Personal portfolio site for Divit Mittal, deployed at
[divit.qezta.com](https://divit.qezta.com). Includes a RAG-powered chatbot
("digital avatar") for visitors to ask about Divit's background, projects,
and skills.

## Stack

- **SvelteKit** with `@sveltejs/adapter-vercel`
- **Three.js** WebGL cursor
- **Google Gemini 2.0 Flash** via `@google/genai` for the chatbot
- Shared design system: [`@qezta/ui`](https://github.com/qezta/ui) (git dep, pinned to a tag)

## Development

```sh
pnpm install
pnpm dev        # vite dev server
pnpm check      # svelte-check
pnpm lint       # prettier + eslint
pnpm build      # production build (Vercel output)
```

## Environment

For the chatbot to work locally, create `.env`:

```
GEMINI_API_KEY=...  # from aistudio.google.com
```

In Vercel, set `GEMINI_API_KEY` in the project's environment variables.

## License

HONCL-1.0 — see [LICENSE](./LICENSE).
