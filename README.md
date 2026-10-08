<div align="center">

# Support Inbox AI

### A small-team help desk where AI turns every email into a reply draft and a ready-to-fix issue

Connect your support mailboxes. Each thread gets an AI-written reply draft, and every real bug gets a developer-ready issue card you can push to GitHub in one click.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Prisma](https://img.shields.io/badge/Prisma-Postgres-2d3748) ![OpenAI](https://img.shields.io/badge/AI-OpenAI-10a37f) ![License MIT](https://img.shields.io/badge/license-MIT-black)

</div>

---

## The problem it solves

At a small software company, the support inbox is also the bug tracker, whether you like it or not. Customers describe real bugs in plain language, and those reports get buried under "please cancel my trial." Support Inbox AI reads every thread and keeps the two jobs apart:

- **Answer the customer.** Each ticket gets an AI reply draft in your voice. You edit it and send it from the right mailbox.
- **Fix the product.** When a thread contains a real problem, the AI writes an issue card: title, full problem summary, why it matters, and a detailed **fix prompt** a coding agent can act on. One click pushes it to GitHub, labelled for the right repo.

## Features

- 📥 **Multi-mailbox inbox.** IMAP sync for up to two accounts, with statuses: Open, Pending, On Hold, Solved, Spam.
- ✍️ **AI reply drafts.** Per ticket, with an optional custom instruction ("make it shorter", "offer a refund").
- 🐞 **Issue extraction.** Turns emails into developer-ready cards, routed to `core` (backend) or `web` (frontend) using your own description of your product.
- 🔁 **GitHub sync.** Creates issues with area labels. Status changes close or relabel them.
- 🤖 **Optional auto-triage.** Includes a [Simili](https://github.com/similigh/simili-bot) config that moves issues from the intake repo to the right product repo.
- 🔐 **Simple auth.** One shared password and an HMAC-signed session cookie. Every route except the landing page and login is protected.

## Quick start

```bash
git clone https://github.com/harrythentrepreneur/support-inbox-ai.git
cd support-inbox-ai
npm install
cp .env.example .env          # fill in DATABASE_URL, AUTH_PASSWORD, AUTH_SECRET, OPENAI_API_KEY, mailbox settings
npx prisma migrate deploy
npx prisma db seed            # optional: demo tickets with made-up customers
npm run dev                   # http://localhost:3000
```

Sign in with `AUTH_PASSWORD`, then press **Sync** to pull mail.

## Configuration

Every variable is documented in [`.env.example`](.env.example). The main ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres for tickets, messages and issues |
| `AUTH_PASSWORD`, `AUTH_SECRET` | Dashboard login and cookie signing |
| `OPENAI_API_KEY` | Reply drafts and issue extraction |
| `EMAIL_1_*`, `EMAIL_2_*` | IMAP/SMTP settings per mailbox |
| `PRODUCT_NAME`, `PRODUCT_ARCHITECTURE` | Tell the AI what your product is and how to split backend and frontend issues |
| `FOUNDER_EMAIL_PREFIX`, `FOUNDER_SIGNOFF` | Personal sign-off when replying from the founder's address |
| `GH_PAT`, `GH_REPO`, `GH_REPO_CORE`, `GH_REPO_WEB` | Where issues are created and which repos they belong to |

## How it works

```
IMAP mailboxes ──sync──▶ Postgres (tickets, messages)
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        AI reply draft               AI issue extraction
        (edit + send via SMTP)       title · summary · why it matters · fix prompt
                                            │
                                            ▼
                                 GitHub issue (area:core / area:web)
                                            │
                                 optional Simili auto-transfer
```

## Status

Built and used for real support at a small education SaaS, then made generic for release. It is a compact Next.js app, not a full help-desk suite: no SLAs, no multi-tenant auth, and two mailboxes at most.

## License

[MIT](LICENSE) · Built by [Harry Edwards](https://github.com/harrythentrepreneur)
