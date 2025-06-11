# Release Flow

This documents the Radish release flow for the maintainers. If you're not a
maintainer, you don't need to read this.

To cut a release, follow these steps:

1. Fix any lint error (slow-types etc.) preventing publishing:
   ```sh
   deno publish --dry-run
   deno doc --lint */*.ts
   ```

2. Create a release branch and run the version bump script from the root:
   ```sh
   deno run -A jsr:@deno/bump-workspaces@0.1.22/cli
   ```
   Note: it will throw a "No target files found" error but this may be in
   prerelease only

3. Review the changes and manually update the following version numbers if
   relevant:
   - runtime/package.json if @radish/runtime was bumped
   - init/template/base/denojsonc if core, runtime or effect-system were bumped
   - (ensure init/deno.jsonc is bumped if the previous step was executed)
   - README/try-it-out section if @radish/init was bumped

4. Create and land a PR

5. Switch back to the main branch, pull the changes and delete the release
   branch

6. Publish @radish/runtime if it has a new version
   ```sh
   cd runtime
   pnpm publish
   ```

7. Tag the main branch with release-YYY-MM-DD (this step can be automated in the
   future):

   ```sh
   git tag release-YYYY.MM.DD
   git push origin release-YYYY.MM.DD
   ```

8. Generate the release notes from github UI and manually update using
   Release.md if needed

9. Publish as pre-release

10. Wait for the workspace publish action to publish the new versions to JSR.
