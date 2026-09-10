# AGENTS.md

## server

Go backend (HTTP API + WebRTC signaling). Listens on `:5050`; state lives in
PostgreSQL (accessed via `pgx`), files never touch disk.

### Commands

Run from `server/`.

- `go run .` - start the server (see `DATABASE_URL` in the README).
- `gofmt -l .` - check formatting (no output means clean).
- `go vet ./...` - static analysis.
- `DATABASE_URL="postgres://droppr:1234@localhost:5432/droppr_test" go test ./...`
  - run tests; the `droppr_test` database must exist (see the README).

Always run `gofmt`, `go vet`, and `go test` after changes; fix all errors.

### File layout

One file per route under `api/`; signaling is a separate package.

```
server/
- main.go      entry point; env config, router setup, graceful shutdown
- schema.sql   PostgreSQL schema (drops, sessions)
- api/         HTTP API handlers (one file per route, plus shared helpers)
- signaling/   WebSocket signaling channel (content-agnostic relay)
```

### Conventions

- Every source file is accompanied by a sibling `_test.go` file exercising it
  (`api/register.go` -> `api/register_test.go`). Shared test setup (e.g. the
  database-backed router) lives in the package-level `api_test.go`.
- Comments should be utilitarian: always prefer renaming variables, functions,
  types, etc., to make a comment redundant and the meaning of something
  obvious.
- Follow Go idioms: `gofmt`-clean, `go vet`-clean; doc comments on exported
  identifiers; table-driven tests where several cases share a shape; prefer
  pure functions (e.g. `turnCredentials`) so logic is testable without a
  database; wrap errors with context instead of discarding them.
- Configuration comes from the environment, is read once in `main.go`, and is
  passed explicitly to constructors (`api.New`); no globals. A half-configured
  optional feature is disabled with a `slog.Warn`, never a panic.
- Handlers are registered in `api.go` with method-pattern paths, begin with
  `setCORS`, log with `slog`, and respond through the shared `writeJSON` /
  `writeHTTPError` helpers.
- The `signaling` package is a content-agnostic message relay; it must not
  gain knowledge of API concepts (drops, sessions, TURN, etc.).

## webclient

React single-page frontend for droppr (P2P file transfer).
Hash-based router, WebRTC data transfer, Tailwind styling.
Run all commands from `webclient/`.

### Commands

- `bun run dev` - start the Vite dev server.
- `bun run build` - production build to `dist/`.
- `bun run preview` - preview the production build.
- `bun run lint` - ESLint.
- `bun run format` - Prettier write (configuration in `package.json`).
- `bun run format:check` - Prettier check.

Always run `lint`, `build`, and `format:check` after changes; fix all errors.

### Tooling

- Package manager: **bun**.
- Bundler/dev server: Vite (`vite.config.js`).
- Styling: Tailwind CSS; source `tailwind.css` (imported by `src/main.jsx`).
- Lint: ESLint flat config (`eslint.config.js`), Prettier-compatible.
- Format: Prettier with `prettier-plugin-classnames`, which auto-wraps
  Tailwind class strings; do not hand-format long class strings.

### File layout

```
webclient/
- public/         static assets served as-is (images, gifs, favicon)
- src/
- - main.jsx      app entry; renders <Router/>
- - Router.jsx    hash router + mount-time API check / file-store prep
- - components/   reusable presentational primitives (props-driven)
- - layouts/      full-screen layout shells (optionally props-driven)
- - routes/       one component per hash route; mostly logic + composition
- - lib/          framework-agnostic JS: WebRTC peer, signaling, file store
- index.html
- tailwind.css    vite.config.js  tailwind.config.js  postcss.config.js
- eslint.config.js  package.json  jsconfig.json
```

### `src/components/`

Small, reusable, mostly stateless UI primitives.
Each is props-driven and is intended to hold mostly Tailwind-styled visuals.
Keep components simple and single-purpose.
All components should be position-agnostic, unless explicitly floating.

Do not add a prose JSDoc description if the name and `@param` types are
sufficient (only document genuinely non-obvious behavior).
Prefer idiomatic React names (verb/noun for behavior, `XInput` for inputs).
Barrel-exported via `components/index.js`.

Explore existing components in `src/components` before creating new ones.
Prefer the composition of existing components over hard-coding a larger one.

When adding a component: create `src/components/Name.jsx`, export a named
function, and add `export * from "./Name.jsx";` to `components/index.js`
(maintain alphabetical order).

### `src/layouts/`

Full-screen layout shells that wrap content with visual chrome.
Owns page-level positioning and structural Tailwind, and uses components.
Barrel-exported via `layouts/index.js`.

When adding a layout: create `src/layouts/Name.jsx`, export a named function,
and add `export * from "./Name.jsx";` to `layouts/index.js`.

### `src/routes/`

One component per hash route (see `Router.jsx`'s `routes` map).
Routes should be mostly logic (state + effects + `window.location.hash`
navigation) and compose components/layouts for the UI.
The dropper and receiver routes are deliberately larger: they own the full
transfer state machine and inline their per-state JSX directly. Barrel-
exported via `routes/index.js`.

When adding a route: create `src/routes/Name.jsx`, export a named function,
add `export * from "./Name.jsx";` to `routes/index.js`, and register it in
`Router.jsx`'s `routes` map (and `getRouteFromHash` if it needs custom
matching).

### `src/lib/`

Framework-agnostic JS (no React). Singleton-based WebRTC transfer machinery
and helpers. Do not put UI here. Public modules are barrel-exported via
`lib/index.js`; internal helpers (e.g. `peer.js`, `signal_channel.js`) are
imported only by other lib modules and need not be exported.

When adding a public lib module: create `src/lib/name.js`, export named
functions/classes, and add `export * from "./name.js";` to `lib/index.js`.

### Conventions

- Imports: `@/` for `src/`; relative imports for sibling files (use the
  `.jsx`/`.js` extension in import paths).
- Routes navigate by setting `window.location.hash` (e.g.
  `"error"`, `"success"`, `"unsafe"`, or `"#<code>"` for receive).
- Cross-route handoff is via `sessionStorage` keys (`isDropper`,
  `elapsedSeconds`, `totalSize`, `fileName`, `error`).
- Static images live in `public/`; reference by absolute path (`/drop.gif`).
- Prefer composing small components over duplicating Tailwind; a route should
  contain little to no Tailwind.
- Comments should be utilitarian: always prefer renaming variables, functions,
  classes, props, etc., to make a comment redundant and the meaning of something
  obvious.

## mobile

React Native app for droppr (P2P file transfer), built with Expo and
`expo-router`. WebRTC via `react-native-webrtc`, state via Zustand.
Run all commands from `mobile/`.

### Commands

- `bun run start` - start the Expo dev server.
- `bun run ios` / `bun run android` - build and run on a simulator/device.
- `bun run web` - start Expo for web.
- `bun run lint` - `expo lint`.
- `bun run format` - Prettier write.
- `bun run format:check` - Prettier check.

Always run `lint` and `format:check` after changes; fix all errors.

### Expo has changed

Expo has changed. Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any code; do not rely on
memory of older Expo/React Native APIs.


### File layout

```
mobile/
- assets/         static assets served as-is (images, gifs, favicon)
- src/
- - app/          Expo Router routes and layouts (thin, delegate to screens/)
- - screens/      screen implementations rendered by routes
- - components/   reusable presentational UI components
- - interfaces/   Interfaces and types used across the application
- - store/        Zustand slices for serializable app state
- - services/     services for handling specific actions across the app
- global.css      global stylings applied to the app components
```

### `src/components/`

Small, reusable, mostly stateless UI primitives.
Each is props-driven and is intended to hold mostly visuals.
Keep components simple and single-purpose.
All components should be position-agnostic, unless explicitly floating.

Do not add a prose JSDoc description if the name and `@param` types are
sufficient (only document genuinely non-obvious behavior).
Prefer idiomatic React names (verb/noun for behavior, `XInput` for inputs).
Barrel-exported via `components/index.js`.

Explore existing components in `src/components` before creating new ones.
Prefer the composition of existing components over hard-coding a larger one.

When adding a component: create `src/components/Name.jsx`, export a named
function, and add `export * from "./Name.jsx";` to `components/index.js`
(maintain alphabetical order).

### `src/app/screens/`

Full-screen layouts
Owns page-level positioning and uses components.
Barrel-exported via `layouts/index.js`.

When adding a layout: create `src/layouts/Name.jsx`, export a named function,
and add `export * from "./Name.jsx";` to `screens/index.js`.

## documentation

Applies to `README.md` and this file.

- Keep documentation accurate against the source; verify claims (versions,
  ports, commands, schema) against `go.mod`, `package.json`, `schema.sql`,
  etc., before writing them.
- Describe structure generically so features can change files without requiring
  documentation changes; avoid enumerating files that may be added, renamed, or
  removed. Where a concrete example helps, mark it as one ("e.g.").
- Prose is utilitarian and to the point, assuming a technical reader with a
  solid understanding of the domain; use correct terminology for the technology
  (e.g. ICE, STUN/TURN, `pgx`) instead of explaining around it.
- No marketing or filler language ("makes it easy", "note that", "handy");
  state facts declaratively.
- ASCII only; no em dashes. Use commas, semicolons, or separate sentences
  instead.
- Match the existing style: lowercase headings, fenced code blocks with the
  language tag, and commands shown with the directory they run from.
