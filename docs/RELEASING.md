# Preparing a Koi release

`cleangithub` is the maintenance checklist below, not an installed command or an
automatic background task. Agents following [AGENTS.md](../AGENTS.md) must run it
whenever preparing a new version. Contributors can follow the same steps manually.

## 1. Establish the release scope

- Read the README, changelog, manifest, [contribution guide](../CONTRIBUTING.md),
  [writing notes](marketing-context.md) and CI workflow.
- Check the branch, index and working tree. Identify existing edits and preserve
  them. Do not include another task's changes accidentally.
- Identify the previous release and review the intended release diff. Describe
  the concrete changes and compatibility risks before editing.

## 2. Review the changed code and text

- Keep Koi's calm tone. Remove repetition, unsupported claims, abandoned placeholders
  and copied conversation text in the changed material.
- Keep legal notices, attribution and useful provenance. Do not falsify authorship
  or delete useful agent instructions.
- Use clear English comments for constraints and intent. Remove stale comments;
  keep actionable TODOs. Verify usage before deleting code or dependencies.
- Limit refactoring to the task. Separate unrelated functional and editorial work
  into focused commits when that makes review easier.
- Check the staged diff for secrets, local configuration, logs and build outputs.

## 3. Prepare the version and notes

- Keep pending changes under `Unreleased` until preparing a release. Do not bump
  the version for routine maintenance commits.
- At release preparation, synchronize `Cargo.toml`, the `koi-monitor` package in
  `Cargo.lock`, and the current source version in the README. The app uses Cargo's
  version; check for other version sources if the build changes.
- Move the selected pending notes to the version heading. Use the actual release
  date when known; otherwise leave the date off until publication. Preserve older
  entries and leave an `Unreleased` section for subsequent work.
- Under `For you`, explain concrete behaviour and limitations. Use `Technical
  details` only for information useful to contributors or integrators. Group related
  changes instead of copying commits. Never invent performance measurements.
- Check changelog comparison links against the selected release base. Update only
  documentation, examples and screenshots affected by the release. Do not claim
  that an unpublished binary is already downloadable.

## 4. Verify

Run from the repository root:

```powershell
pwsh -NoProfile -File scripts/check-release.ps1
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo audit
cargo build --locked --release
git diff --check
```

Review formatting in the changed code without mass-formatting unrelated files.
Inspect visible changes in the app and exercise changed error paths where possible.
Check documentation links and confirm that the release notes match the final diff.
Report unavailable hardware checks, network checks or tools explicitly.

The CI `audit` job runs version consistency, dependency auditing, Clippy and tests
on pull requests. Version checks require matching manifest, lockfile and README
versions, an `Unreleased` section and nonempty `For you` notes for the current
version. They do not certify writing quality, release availability or visual
correctness. Branch protection must require `audit` to block merging on failure;
the workflow itself cannot configure that repository setting.

## 5. Commit and hand off

Review the final diff, stage explicit files or hunks, then create focused commits
using English Conventional Commit titles. Summarize what changed, verification
results and any remaining limits. Use the
[PR template](../.github/pull_request_template.md) when preparing a pull request.

Follow the publication steps in [CONTRIBUTING.md](../CONTRIBUTING.md) only when
authorized. Preparation does not push, merge, tag or publish a release automatically.
