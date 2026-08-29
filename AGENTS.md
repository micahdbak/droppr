# AGENTS.md

## server

Go backend (HTTP API + WebRTC signaling).

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
  Tailwind class strings — do not hand-format long class strings.

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
