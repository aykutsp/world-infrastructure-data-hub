# Security Policy

## Reporting a vulnerability

If you find a security issue in the code, data pipeline or the published dataset, please **do not** open a public GitHub issue. Instead, send a short report to the project owner via a GitHub private security advisory:

**https://github.com/aykutsp/world-fuel-prices/security/advisories/new**

Please include:

- A description of the issue
- Steps to reproduce (proof-of-concept URLs or code snippets are welcome)
- What you believe the impact is
- Any suggested mitigation

You should get an initial response within a few business days. Verified issues will be fixed, a patched release will be cut, and you'll be credited in the release notes (unless you prefer to stay anonymous).

## Scope

This project is a static dataset pipeline and a client-side web app. The main things worth reporting are:

- XSS in the app (e.g. unescaped country names, user-provided waypoint labels)
- Supply-chain risks introduced by one of the upstream feeds
- Pipeline bugs that cause the published dataset to be mis-attributed or leak private data
- Issues in the client libraries under `libraries/`

Out of scope:

- Availability of the upstream data providers (EU Commission, World Bank, government portals). We don't control those.
- Rate limits or bans triggered by your own scripts hammering the public endpoints.
