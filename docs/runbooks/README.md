# Runbooks

Step-by-step operational procedures for the people (including future-you) who have to fix things at 3 am.

| Runbook | When to use it |
|---|---|
| [`add-new-country.md`](./add-new-country.md) | A country is missing from the dataset or a new recognised state appears |
| [`add-new-metric.md`](./add-new-metric.md) | You want to ship a 16th metric (or replace an existing one) |
| [`upstream-feed-failure.md`](./upstream-feed-failure.md) | One of the 9 upstream sources 404s, times out, or silently changes schema |
| [`release.md`](./release.md) | Cutting a tagged release + publishing client libraries |
| [`rollback.md`](./rollback.md) | Something bad shipped — revert the live site fast |

Each runbook aims for three sections: **Symptom**, **Diagnosis**, **Fix**.

If you need a runbook that isn't here, write it after you've solved the problem the first time. Runbooks are cheaper than re-learning.
