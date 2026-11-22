## Type-check, lint, test and build the site on every PR. Until now the only
## PR workflow was flake-check, which ignored src/ entirely.
_: let
  pinned = {
    checkout = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"; # v7.0.1
    nixInstall = "nixbuild/nix-quick-install-action@9f63be77f412a248c9d9a65a4c82cf066cdf8f0c"; # v35
    nixCache = "DeterminateSystems/magic-nix-cache-action@84c0677f58dcedf3b91f8223ce36a9ea5b3c84b7"; # v15
  };
  ## Node 24 matches the Vercel project's node_version; pinned via flake.lock.
  node = cmd: "nix shell --inputs-from . nixpkgs#nodejs_24 nixpkgs#pnpm -c ${cmd}";
  paths = [
    "src/**"
    "static/**"
    "scripts/**"
    "package.json"
    "pnpm-lock.yaml"
    "pnpm-workspace.yaml"
    "svelte.config.js"
    "vite.config.ts"
    "tsconfig.json"
    "eslint.config.js"
    ".prettierignore"
    "flake.lock"
    "flake/actions/web-ci.nix"
  ];
in {
  flake.actions-nix.workflows.".github/workflows/web-ci.yml" = {
    name = "web ci";
    on = {
      pull_request = {inherit paths;};
      push = {
        branches = ["main"];
        inherit paths;
      };
      workflow_dispatch = {};
    };
    concurrency = {
      group = "web-ci-\${{ github.ref }}";
      cancel-in-progress = true;
    };
    permissions.contents = "read";
    jobs.web = {
      steps = [
        {
          name = "Checkout";
          uses = pinned.checkout;
          "with".persist-credentials = false;
        }
        {
          name = "Install Nix";
          uses = pinned.nixInstall;
        }
        {
          name = "Nix cache";
          uses = pinned.nixCache;
        }
        {
          name = "Install dependencies";
          run = node "pnpm install --frozen-lockfile";
        }
        {
          name = "Type-check (svelte-check)";
          run = node "pnpm check";
        }
        {
          ## `pnpm lint` also runs prettier --check, which fails repo-wide
          ## (no shared Prettier config yet); ESLint alone is clean.
          name = "ESLint";
          run = node "pnpm exec eslint .";
        }
        {
          name = "Unit tests (vitest)";
          run = node "pnpm test";
        }
        {
          name = "Sitemap tests";
          run = "PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py'";
        }
        {
          name = "Build (Vercel adapter)";
          run = node "pnpm build";
        }
        {
          name = "Build (IPFS static mirror)";
          run = node "pnpm build:ipfs";
        }
      ];
    };
  };
}
