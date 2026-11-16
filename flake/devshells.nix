{
  inputs,
  lib,
  ...
}: {
  imports = [inputs.devshell.flakeModule];

  perSystem = {
    pkgs,
    config,
    ...
  }: {
    devshells.default = {
      devshell = rec {
        name = "qezta-divit";
        motd = "{202}Welcome to {91}${name} {202}devshell!{reset} \n $(menu)";
        startup = {
          git-hooks.text = ''
            ${config.pre-commit.installationScript}
          '';
        };
        packages = lib.attrsets.attrValues {
          inherit
            (pkgs)
            ### LSPs & Formatters
            ## Nix
            nixd
            alejandra
            ;
          ## Deploys (Vercel); not packaged in nixpkgs, so run a pinned release
          ## via `pnpm dlx` (same approach as OS-nixCfg's mkPnpmDlxBin).
          vercel = pkgs.writeShellScriptBin "vercel" ''
            exec ${pkgs.pnpm}/bin/pnpm dlx vercel@65.9.0 "$@"
          '';
        };
      };
    };
  };
}
