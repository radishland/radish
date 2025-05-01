# Release Flow

This documents the Radish release flow for the maintainers. If you're not a
maintainer, you don't need to read this.

To cut a release, follow these steps:

1. Fix any lint error (slow-types etc.) preventing publishing:
   ```sh
   deno publish --dry-run
   ```

1. Create a release branch and run the version bump script:
   ```sh
   deno run -A jsr:@deno/bump-workspaces@0.1.22/cli
   ```
   Note: it will throw a "No target files found" error but this may be in
   prerelease only

1. Review the changes and manually update the following version numbers if relevant:
   - in the README/try-it-out section
   - in the init/deno.json template file

1. Create and land a PR

1. Switch back to the main branch, pull the changes and delete the release branch

1. Tag the main branch with release-YYY-MM-DD (this step can be automated in the
   future):

   ```sh
   git tag release-YYYY.MM.DD
   git push origin release-YYYY.MM.DD
   ```

1. Publish the tag from github UI (Make sure the tag has the correct form).

1. Wait for the workspace publish action to publish the new versions to JSR.
