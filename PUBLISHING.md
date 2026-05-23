# Publishing

`@montageai/mcp` uses npm Trusted Publishing through GitHub Actions.

## Registry setup

Configure the npm package publisher for:

- Package: `@montageai/mcp`
- Repository: `usemontage/mcp`
- Workflow file: `.github/workflows/publish.yml`
- Environment: `npm-publish`

The package version is controlled by `package.json`.

## Release

1. Confirm the local package:

   ```bash
   npm test
   npm run build
   npm pack --dry-run
   ```

2. Push `main`.

3. Run the `Publish to npm` GitHub Actions workflow manually with:

   ```text
   confirm=publish
   ```

The workflow runs `npm publish --provenance --access public`.

## Current first-publish failure

If npm returns:

```text
404 Not Found - PUT https://registry.npmjs.org/@montageai%2fmcp
The requested resource '@montageai/mcp@0.1.0' could not be found or you do not have permission to access it.
```

then the GitHub workflow is valid, but npm does not yet authorize this repository/workflow to create or publish `@montageai/mcp`.
