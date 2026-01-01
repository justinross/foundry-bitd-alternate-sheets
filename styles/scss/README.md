# How to build CSS

Prereqs: Node.js installed.

1. Install dependencies (once): `npm install`
2. Build: `npm run build:css`
3. Watch (optional): `npm run watch:css`

Notes:
- `styles/scss/main.scss` is the entrypoint; `styles/scss/bitd-alt.scss` forwards to it for compatibility.
- Files under `styles/scss/import/` are forwarder shims; new work should go under `styles/scss/abstracts/`, `styles/scss/layout/`, or `styles/scss/components/`.

