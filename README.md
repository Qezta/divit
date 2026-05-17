# divit.qezta.com

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

MIT — see [LICENSE](./LICENSE).
