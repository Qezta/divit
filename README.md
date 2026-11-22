<div id="top">
    <div align="center">
        <img alt='An abstract image of a donut-like object' title='Qezta' height=250 width=250 src='https://qezta.com/qezta.gif' />
        <h1 align='center'>divit</h1>
        <strong>divit.qezta.com: personal portfolio with Gemini-powered RAG chatbot</strong>
    </div>

</div>

---

<div align='center'>
    <a href="https://github.com/Qezta/divit/stargazers">
        <img src="https://img.shields.io/github/stars/Qezta/divit?&style=for-the-badge&logoColor=white&color=purple&logo=starship" alt="stars"/>
    </a>
    <a href="https://github.com/Qezta/divit/">
        <img src="https://img.shields.io/github/repo-size/Qezta/divit?&style=for-the-badge&logoColor=white&color=purple&logo=github" alt="size"/>
    </a>
    <a href="https://github.com/Qezta/divit/blob/main/LICENSE">
        <img src="https://img.shields.io/github/license/Qezta/divit?&style=for-the-badge&logoColor=white&color=purple&logo=unlicense" alt="license"/>
    </a>
    <a href="https://github.com/nixos/nixpkgs">
        <img src="https://img.shields.io/badge/Nixpkgs-unstable-blue.svg?style=for-the-badge&logo=NixOS&logoColor=white&color=purple" alt="nixpkgs"/>
    </a>
    <a href="https://divit.qezta.com">
        <img src="https://img.shields.io/badge/site-divit.qezta.com-purple.svg?style=for-the-badge&logo=googlechrome&logoColor=white" alt="site"/>
    </a>
    <img src="https://img.shields.io/github/languages/top/Qezta/divit?style=for-the-badge&color=purple" alt="repo-top-language"/>
</div>

---

<div align='center'>
    <a href="https://github.com/Qezta/divit/actions/workflows/flake-check.yml">
        <img src="https://github.com/Qezta/divit/actions/workflows/flake-check.yml/badge.svg" alt="flake-check"/>
    </a>
    <a href="https://github.com/Qezta/divit/actions/workflows/gen-sitemap.yml">
        <img src="https://github.com/Qezta/divit/actions/workflows/gen-sitemap.yml/badge.svg" alt="gen-sitemap"/>
    </a>
</div>

---

## Contents

- [Overview](#overview)
- [Stack](#stack)
- [How the chatbot works](#how-the-chatbot-works)
- [Development](#development)
- [Environment](#environment)
- [License](#license)

---

## Overview

Personal portfolio site for Divit Mittal, deployed at
[divit.qezta.com](https://divit.qezta.com). Includes a RAG-powered chatbot
("digital avatar") for visitors to ask about Divit's background, projects,
and skills.

## Stack

- **SvelteKit** with `@sveltejs/adapter-vercel`
- **Three.js** WebGL cursor
- **Google Gemini 2.0 Flash** via `@google/genai` for the chatbot
- Shared design system: [`@qezta/ui`](https://github.com/qezta/ui) (git dep, pinned to a tag)

## How the chatbot works

```mermaid
sequenceDiagram
  actor V as Visitor
  participant C as Chatbot (@qezta/ui)
  participant A as POST /api/chat
  participant R as rag.ts
  participant G as Gemini 2.0 Flash
  V->>C: question
  C->>A: messages
  A->>R: retrieveContext(last message)
  R-->>A: top 4 knowledge-base chunks<br/>(keyword-overlap scoring)
  A->>G: system prompt + context + messages
  G-->>A: streamed answer
  A-->>C: stream
  C-->>V: answer
```

## Development

```sh
pnpm install
pnpm dev        # vite dev server
pnpm check      # svelte-check
pnpm lint       # prettier + eslint
pnpm build      # production build (Vercel output)
pnpm build:ipfs # static mirror in build/ipfs, with chat disabled
```

## Environment

For the chatbot to work locally, create `.env`:

```
GEMINI_API_KEY=...  # from aistudio.google.com
```

In Vercel, set `GEMINI_API_KEY` in the project's environment variables.

## License

MIT — see [LICENSE](./LICENSE).

<div align="right">

[![][back-to-top]](#top)

</div>

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square&color=purple
