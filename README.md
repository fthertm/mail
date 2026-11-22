# Mail

Modern self-hosted webmail client on Cloudflare Workers.

[![MIT License](https://img.shields.io/github/license/fthertm/mail?style=flat)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/)
[![pnpm](https://img.shields.io/badge/package%20manager-pnpm-f69220?style=flat&logo=pnpm&logoColor=white)](https://pnpm.io/)

## About

Mail is a self-hosted webmail client that runs entirely on Cloudflare: a Vue 3 single-page app served by a Hono-based Worker, with D1, KV and R2 for storage. It receives mail through Cloudflare Email Workers, sends through Resend, and supports multiple addresses per account, Web Push notifications and PWA install.

This project is derived from [beihaime/nova-mail](https://github.com/beihaime/nova-mail), which is itself based on [maillab/cloud-mail](https://github.com/maillab/cloud-mail). It is **not a GitHub fork** (the repository has no fork link to upstream), but the code originates there.

## What's different from upstream

This repository mainly contains:

1. **Rebranding** to Mail.
2. **Two security fixes** for vulnerabilities found and fixed by Nemesis:
   - Mail reader sanitizer bypass via `<style>` inside `<svg>` defeats remote-image blocking ([GHSA-32w3-gf87-5pcm](https://github.com/fthertm/mail/security/advisories/GHSA-32w3-gf87-5pcm))
   - Plus-address ownership check missing from `/register` allows interception of another user's mail ([GHSA-g873-w536-qvq2](https://github.com/fthertm/mail/security/advisories/GHSA-g873-w536-qvq2))

Features and configuration are otherwise unchanged from upstream.

## Tech stack

- **Frontend:** Vue 3, Vite, Pinia, Vue Router, Element Plus, DOMPurify, `vite-plugin-pwa`
- **Backend:** Cloudflare Workers, Hono, Drizzle ORM, Postal MIME
- **Infrastructure:** D1 (data), KV (sessions and cache), R2 (attachments), Email Workers (inbound), Resend (outbound)

## Development

Requirements: Node.js 24 (what CI uses) and pnpm 12. The repository is a single pnpm workspace with two packages, `mail-vue` and `mail-worker`, and one lockfile at the root.

```bash
git clone https://github.com/fthertm/mail.git
cd mail
pnpm install

pnpm dev                 # Vite dev server + wrangler dev
pnpm build               # build the frontend into mail-worker/dist
pnpm test                # frontend + Worker suites (the same command CI runs)
```

Run a single suite with `pnpm test:frontend`, `pnpm test:worker`, `pnpm test:worker:unit` or `pnpm test:worker:integration`.

## Deployment

`.github/workflows/deploy-cloudflare.yml` deploys to Cloudflare Workers. It runs on pushes to `main` that touch `mail-worker/`, `mail-vue/`, the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or the workflows, and can also be started manually (`workflow_dispatch`).

1. **Test** runs `pnpm install --frozen-lockfile` and `pnpm test`. A failing test blocks the deploy.
2. **Build and Deploy** renders `wrangler-action.toml` from your secrets, applies additive schema migrations to an existing D1 database, builds the frontend, deploys the Worker, initializes a *new* database once, and reads the schema back to verify it.

> GitHub disables Actions in forks. If you fork this repository, enable workflows from the **Actions** tab first.

### Repository secrets

Each value is read as `secrets.NAME || vars.NAME`. Put credentials in **Secrets**, because variable values appear in run logs. Every value must be a single line.

| Name | Required | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | yes | API token (permissions below) |
| `CLOUDFLARE_ACCOUNT_ID` | yes | Cloudflare account ID |
| `JWT_SECRET` | yes | long random string that signs login tokens; changing it signs everyone out |
| `ADMIN` | yes | administrator's email address |
| `DOMAIN` | yes | JSON array, e.g. `["example.com"]` |
| `D1_DATABASE_ID` | yes | ID of your D1 database (`pnpm wrangler d1 list`); the pipeline stops without it |
| `BOOTSTRAP_TOKEN` | new installs only | independent random secret, 32+ characters; initializes an empty database once |
| `KV_NAMESPACE_ID` | no | looked up or created by name when unset |
| `CUSTOM_DOMAIN` | no | e.g. `mail.example.com`; the route is skipped when unset |
| `NAME` | no | Worker name, defaults to `nova-mail` |
| `R2_BUCKET_NAME`, `PROJECT_LINK`, `AI_MODEL`, `ANALYSIS_CACHE`, `CF_EMAIL` | no | optional features; see `wrangler-action.toml` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | no | enable Web Push notifications |

**API token permissions:** Account → Workers Scripts · Edit, Workers KV Storage · Edit, D1 · Edit; Zone → Workers Routes · Edit, Zone · Read. Without D1 · Edit the schema verification step only warns.

## Security

Found a vulnerability? Please report it privately through the repository's [Security tab](https://github.com/fthertm/mail/security/advisories/new) instead of opening a public issue.

## Credits

Mail builds on [beihaime/nova-mail](https://github.com/beihaime/nova-mail) and [maillab/cloud-mail](https://github.com/maillab/cloud-mail). Their authors remain credited under the original license.

## License

[MIT](LICENSE). The repository retains the copyright notices of the upstream authors.
