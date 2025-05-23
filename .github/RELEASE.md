# Release Flow

This documents the Radish release flow for the maintainers. If you're not a
maintainer, you don't need to read this.

To cut a release, follow these steps:

1. Fix any lint error (slow-types etc.) preventing publishing:
   ```sh
   deno fmt --check
   deno lint
   deno check
   deno publish --dry-run
   ```

1. Create a release branch and run the version bump script from the root:
   ```sh
   deno run -A jsr:@deno/bump-workspaces@0.1.22/cli
   ```
   Note: it will throw a "No target files found" error but this may be in
   prerelease only

1. Review the changes and manually update the following version numbers if
   relevant:
   - README/try-it-out section if @radish/init was bumped
   - runtime/package.json if @radish/runtime was bumped
   - init/template/base/denojsonc if @radish/core or @radish/runtime were bumped

1. Create and land a PR

1. Switch back to the main branch, pull the changes and delete the release
   branch

1. Publish @radish/runtime if it has a new version
   ```sh
   pnpm publish
   ```

1. Tag the main branch with release-YYY-MM-DD (this step can be automated in the
   future):

   ```sh
   git tag release-YYYY.MM.DD
   git push origin release-YYYY.MM.DD
   ```

1. Publish as pre-release from github UI

1. Wait for the workspace publish action to publish the new versions to JSR.
