# mneme-web

Browser client for the mneme-core backend.

## Prerequisites

- Node.js 20.19+ or 22.12+

## Commands

```sh
npm install       # install dependencies
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run lint      # lint with ESLint/oxlint
npm run test:unit # run unit tests with Vitest
```

## Docker

Node only builds the app — at runtime the image serves the static `dist/` output with
nginx.

```sh
docker build -t mneme-web:local .
docker run -p 8081:80 mneme-web:local
```

`VITE_API_BASE_URL` is inlined into the bundle at build time (Vite reads `VITE_*` vars
when it builds, not when the container starts), so it must be supplied as a build
argument, not an environment variable at `docker run` time:

```sh
docker build -t mneme-web:local --build-arg VITE_API_BASE_URL=https://api.example.com .
```

This means one image is fixed to one API URL. If that becomes a problem later (one image,
several environments), the fix is a small runtime config file that nginx serves and the
app fetches on startup — not needed yet.

`VITE_DEV_TOKEN` is a local development convenience only. It must never be passed as a
build argument or baked into an image — production builds have no token; authentication
is the job of the upcoming registration service.
