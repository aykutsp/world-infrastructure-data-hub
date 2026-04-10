# Cutting a release

## When

- A feature branch has been merged to `main` and you want to tag it.
- A client library needs publishing to its registry (npm / PyPI / pub.dev / NuGet / Go modules).

## Prerequisites

- Local clone up to date with `origin/main`.
- `gh` CLI logged in.
- Registry credentials set up **locally** if you're publishing libraries (see each `libraries/<lang>/README.md`).
- A clear head — releases on Friday afternoons are a bad idea.

## Steps

### 1. Sanity check the main branch

```bash
git checkout main
git pull
npm ci
npm run generate-data
npm run validate
npm run test
npm run build
```

Everything has to be green. If `generate-data` fails because an upstream is down, **pause** — you don't want to cut a release with half the dataset missing.

### 2. Pick the version

Follow semver:

- **Patch** (`1.2.3 → 1.2.4`) — bug fix, doc fix, visual tweak.
- **Minor** (`1.2.3 → 1.3.0`) — new metric, new feature, new language support, non-breaking library change.
- **Major** (`1.2.3 → 2.0.0`) — breaking change to the JSON schema, to the library API, or to the client behaviour.

Breaking changes to the JSON schema must also introduce a new `/api/v2/` endpoint per ADR-0007. Don't cut a `2.0.0` without that migration plan.

### 3. Bump the version in `package.json`

```bash
npm version <major|minor|patch> --no-git-tag-version
```

Update the changelog entry at the bottom of the root `README.md` under `## 📜 Changelog`. Keep it factual — what shipped, not how hard it was.

### 4. Commit + push

```bash
git add package.json README.md
git commit -m "release vX.Y.Z"
git push origin main
```

The daily cron will pick up the new code. Wait for the deploy workflow to go green before tagging.

### 5. Tag + GitHub release

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
gh release create vX.Y.Z --generate-notes --title "vX.Y.Z — <one-line>"
```

Replace the auto-generated notes with something richer if it's a minor or major release — see past release notes for the tone.

### 6. Publish libraries (optional, per release)

Only if the change affected them. Each library has a `publish` script in its own `package.json` / `pyproject.toml` / `pubspec.yaml` / `*.csproj`.

| Language | Command | Prereq |
|---|---|---|
| TypeScript | `cd libraries/typescript && npm publish` | `npm login` |
| Python | `cd libraries/python && python -m build && twine upload dist/*` | `~/.pypirc` with API token |
| Go | Just tag the repo — Go modules pick up the tag automatically | — |
| Dart/Flutter | `cd libraries/flutter && dart pub publish` | `dart pub login` |
| .NET | `cd libraries/csharp && dotnet pack -c Release && dotnet nuget push bin/Release/*.nupkg` | `NUGET_API_KEY` env var |

Each library has its own semver cadence — they don't all have to bump together.

### 7. Announce

Paste the release link into any channel that cares. For this project that's usually nothing; if the release is big, the promotion playbook in `PROMOTION.md` in the sibling project (world-fuel-prices) has templates for social posts, Show HN, etc.

## Rollback

If the release broke production, follow [`rollback.md`](./rollback.md). Don't push a "fix" release to main without first confirming rollback works — you'd otherwise be racing against a daily cron.
