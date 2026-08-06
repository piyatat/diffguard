# Findings glossary

Human labels for Diffguard **heuristic** categories. Exact rule ids may evolve; treat this as product language for reports and CI triage.

| Category | What it usually means | Typical severity |
| --- | --- | --- |
| Secret-shaped strings | Assignment/literals in **added** lines that look like keys/tokens (values redacted in output) | critical / high |
| Auth / session paths | Touches auth, session, OAuth, permission gates | high / medium |
| Payments / billing | Checkout, stripe, wallet, invoice money paths | high / medium |
| Migrations / schema | DB migrations without clear down/rollback story | high / medium |
| CI / release config | Workflows, deploy manifests, branch protection-ish files | medium |
| Missing tests | Source changed without nearby test updates; deleted tests | medium / high |
| Oversized diff | Very large file or hunk count — consider splitting the PR | medium / low |
| Safety bypasses | `CORS *`, `eslint-disable`, TLS verify off, dangerous flags | high / medium |
| Lockfile churn | Lockfile changed without manifest (or vice versa) | medium / low |

AI findings (with `--ai`) are tagged separately and may confirm, refute, or extend heuristics. `--fail-on` still keys off **severity**, not letter grade.
