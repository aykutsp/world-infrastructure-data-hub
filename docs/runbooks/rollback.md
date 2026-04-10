# Rollback

## Symptom

- A deploy made the live site worse (visual regression, bad numbers, JS error on load).
- You need the last-known-good build back on the live URL **now**, not after another full CI run.

## Options, in order of preference

### Option 1 — Revert the bad commit

Fast, audited, leaves a trail in git history. Preferred.

```bash
git checkout main
git pull
git log --oneline -10      # find the bad SHA
git revert <bad-sha>
git push origin main
```

The daily deploy workflow picks this up within ~2 minutes and redeploys. Nothing else to do.

### Option 2 — Re-run a previous successful workflow

Use this if the bad change was *only* in the build (a GitHub Actions config edit, a dependency bump) and not in the source code.

1. Open the repository's **Actions** tab.
2. Find the most recent **successful** `Build and deploy` run.
3. Click the run, then **Re-run all jobs** in the top-right.

This re-deploys the exact bytes that were live last time. It does not change `main`, so the underlying bug is still there and must be fixed in a follow-up commit.

### Option 3 — Force-push the previous tag

Only if options 1 and 2 are unavailable (e.g. the deploy workflow itself is broken).

```bash
git checkout main
git reset --hard <last-known-good-sha>
git push --force-with-lease origin main
```

This rewrites history. Use only in an emergency. Tell the contributors who have branches based on `main` that they need to rebase.

## After rollback

1. **Verify** the live site is back to a sane state. Hard-refresh (`Ctrl+F5`) so you don't stare at a cached broken version.
2. **Open an issue** with the rollback SHA and a short post-mortem of what went wrong. Don't wait — memory fades fast.
3. **Add a test** for whatever broke if a test would have caught it. Rolling back without adding a test means shipping the same bug twice.
4. **Close the loop** — either fix-forward in a new commit or open a PR that properly redoes the feature with the bug fixed.

## Things to avoid

- **Don't panic-delete the bad commit** with `git push --force` without `--force-with-lease`. You'll wipe whatever someone else pushed in the last five minutes.
- **Don't edit files directly in GitHub's web UI** during an incident. It works, but the resulting commits miss pre-commit hooks and the PR review that would have caught the issue in the first place.
- **Don't skip the post-mortem issue** just because the incident is over. The value is in remembering; human memory is bad at this.
