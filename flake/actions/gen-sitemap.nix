_: {
  flake.actions-nix.workflows.".github/workflows/gen-sitemap.yml" = {
    on = {
      push = {
        branches = ["main"];
        paths-ignore = [
          "**/*.md"
          ".github/**"
          # Merging a sitemap update must not start another update.
          "static/sitemap.xml"
        ];
      };
      workflow_dispatch = {};
    };

    concurrency = {
      group = "sitemap-update";
      cancel-in-progress = false;
    };

    jobs.gen-sitemap = {
      # Manual dispatches from other branches must not run with write access.
      "if" = "github.ref == 'refs/heads/main'";
      permissions = {
        contents = "write";
        pull-requests = "write";
      };
      steps = [
        {
          name = "Checkout main";
          uses = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"; # v7.0.1
          "with" = {
            ref = "main";
            # The generator uses each file's last commit date for lastmod.
            fetch-depth = 0;
            persist-credentials = false;
          };
        }
        {
          name = "Generate the sitemap";
          uses = "cicirello/generate-sitemap@6a56a20238e631d653600cf792c3596722b78259"; # v1.10.4
          "with".base-url-path = "https://divit.qezta.com/";
        }
        {
          # sitemap-path is an action output, not a configurable input.
          name = "Place the sitemap in the static directory";
          run = "mv sitemap.xml static/sitemap.xml";
        }
        {
          name = "Create or update sitemap pull request";
          uses = "peter-evans/create-pull-request@3ffccacd46053766916f087ce41d627c0b8cf2d1"; # v8.1.3
          "with" = {
            base = "main";
            branch = "automation/update-sitemap";
            add-paths = "static/sitemap.xml";
            commit-message = "chore(sitemap): update sitemap";
            title = "chore(sitemap): update sitemap";
            body = "Update static/sitemap.xml using the sitemap generator.";
            author = "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>";
            delete-branch = true;
          };
        }
      ];
    };
  };
}
