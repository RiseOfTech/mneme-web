# Docker image & CI for mneme-web — spec

## Goal

Package the front-end as a Docker image and build it automatically in CI, so images
accumulate in the registry ready for a later deployment. Nothing is deployed yet.

Mirrors what `mneme-core` already does: PR runs checks, merge to `develop`/`master`
builds and publishes an image to GitHub Container Registry.

## Background: Vite builds static files

`npm run build` compiles the app into a `dist/` folder of static HTML/JS/CSS. **Node is
only needed to build** — at runtime a plain web server serves those files. The runtime
image must therefore be nginx serving `dist/`, not a Node process. Expected image size
is tens of megabytes, not hundreds.

## In scope

### 1. Dockerfile (repository root)

Multi-stage:

- **Build stage** — a Node image (Node 22 LTS, matching local development). Copy
  `package.json` and `package-lock.json` first and run a clean install, **then** copy the
  source and build. Copying manifests before sources means Docker caches the dependency
  layer and only reinstalls when dependencies actually change — the same layer-caching
  discipline `mneme-core`'s Dockerfile uses.
  Use `npm ci` (not `npm install`) — it installs exactly what the lockfile pins and fails
  if the lockfile is out of sync. CI builds must be reproducible.
- **Runtime stage** — an nginx image (alpine variant is fine here; no native
  dependencies are involved). Copy only `dist/` from the build stage into nginx's web
  root. Nothing else from the build stage carries over.
- Run as non-root where the base image allows it.
- `EXPOSE 80`.

Add a `.dockerignore` covering at least `node_modules`, `dist`, `.git`, and local env
files — otherwise the build context uploads hundreds of megabytes of `node_modules` for
no reason, and a stale local `dist/` could shadow the built one.

### 2. nginx config for a single-page app

A default nginx config serves files literally: a request for `/session` looks for a file
named `session` and 404s. A Vue SPA needs **all** unknown paths to fall back to
`index.html`, so the client-side router can handle them.

Add a minimal nginx config with a `try_files` fallback to `index.html`, and copy it into
the runtime stage. Keep it minimal: no gzip tuning, no cache headers, no proxying — those
are deployment concerns, not this slice's.

### 3. Build-time API configuration

Vite inlines `VITE_*` variables into the bundle **at build time** — they are not read at
container start. Consequently the API base URL is baked into the image.

- `VITE_API_BASE_URL` must be supplied as a Docker **build argument** (`ARG` /
  `--build-arg`), passed into the build stage, with a sensible default.
- **Never bake a token into the image.** `VITE_DEV_TOKEN` is a local development
  convenience only; it must not be passed as a build arg, must not appear in the
  Dockerfile, and must not be committed. A production build has no token — how users
  authenticate is the job of the upcoming registration service, not of this image.
- Document in the README that the API URL is fixed at image build time. If that becomes
  a problem later (one image, several environments), the usual answer is a runtime
  config file that nginx serves and the app fetches on startup — **do not build that
  now**, just note the constraint.

### 4. GitHub Actions workflow (`.github/workflows/ci.yml`)

Two jobs, mirroring `mneme-core`:

- **`check`** — runs on both pull requests and pushes to `develop`/`master`. Sets up
  Node 22, `npm ci`, then runs the project's existing checks: type-check, lint, unit
  tests, and `npm run build`. Use whatever script names the project actually defines —
  do not invent script names; read `package.json`. If a check has no script, skip it
  rather than adding one.
- **`build-image`** — `needs: check`, and runs **only on push** (`if:
  github.event_name == 'push'`), never on pull requests. Logs in to `ghcr.io` using the
  workflow's `GITHUB_TOKEN` (requires `permissions: packages: write`), builds for
  `linux/amd64`, and pushes tags:
    - `ghcr.io/<owner>/mneme-web:<commit-sha>`
    - `ghcr.io/<owner>/mneme-web:latest`

  Use the same owner as the core's image. Cache the npm install layer if it is a
  one-line addition; do not over-engineer.

## Out of scope

- No deployment, no compose file, no server, no domain.
- No runtime environment injection (the API URL stays build-time; noted, not solved).
- No tokens or secrets in the image or the workflow.
- No release/version tagging scheme yet — SHA and `latest` only.
- No branch protection, no changes to application code.
- No nginx tuning beyond the SPA fallback.

## Acceptance criteria

1. `docker build -t mneme-web:local .` succeeds locally.
2. The resulting image is tens of MB, not hundreds — proving Node did not leak into the
   runtime stage.
3. `docker run -p 8081:80 mneme-web:local` serves the app at `http://localhost:8081`,
   and a deep link (e.g. `http://localhost:8081/session`, if such a route exists) returns
   the app rather than a 404 — proving the SPA fallback works.
4. Rebuilding after changing only a source file reuses the cached dependency layer.
5. `grep` finds no token anywhere in the Dockerfile or the workflow.
6. On a pull request, `check` runs and `build-image` is skipped.
7. On merge to `develop`, both jobs run and an image appears in the repository's
   Packages.

## Notes

- Read `package.json` before writing the workflow — use the script names that exist.
- The image built here will not talk to a real backend yet; that is fine. The point is
  that images accumulate and the pipeline is proven before deployment matters.