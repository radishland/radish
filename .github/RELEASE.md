# Release Flow

This documents the Radish release flow for the maintainers. If you're not a maintainer, you don't need to read this.

To cut a release, follow these steps:

1. Trigger the version_bump action with the `main` branch selected.

2. Wait for the bot to create a release PR. Note: the tool automatically determines the necessary version upgrades.

3. Review the PR, and update it if necessary.

4. Land the PR.

5. Tag the main branch with release-YYY-MM-DD (this step can be automated in the future):

    ```sh
    git tag release-YYYY.MM.DD
    git push origin release-YYYY.MM.DD
    ```

6. Publish the tag from github UI (Make sure the tag has the correct form).

7. Wait for the workspace publish action to publish the new versions to JSR.
