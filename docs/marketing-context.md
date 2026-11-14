# Writing for Koi

Koi is a Windows system monitor with a calm, playful personality. Write as if you're showing a friend what's changed on your own PC.

## Tone

Keep it simple and specific. A little pond or sakura humour is welcome; every paragraph doesn't need a joke. Give useful details before adjectives, and let screenshots show the atmosphere.

Avoid strings of slogans, inflated promises, digs at other apps and repeating the same benefit in several sections. Don't call something faster or lighter without measurements and context.

## Release notes

The `For you` section in `CHANGELOG.md` is for people using the app. Explain what they can now do, what was annoying and is fixed, or what still needs work. A few short bullets are usually enough.

Put libraries, build changes and implementation details under `Technical details`. Keep alpha limitations visible. Don't direct people to a download until that build has actually been published.

For example:

- "The desktop widget now shows GPU usage alongside CPU, RAM and ping."
- "Koi remembers your music volume for the next launch."
- "This is the first Rust alpha. Keyboard navigation still needs work."

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the release steps. Releases are published manually; there is no automated release workflow.

## Comments and commits

Write code comments in English. Explain a constraint or a surprising decision;
leave descriptions of what changed to Git. Keep TODOs specific enough to act on.
Preserve licenses, required attribution and useful provenance when editing text.

Keep each commit focused on one purpose. Use the existing Conventional Commits
style, with an English imperative title, such as
`fix(drivers): distinguish failed searches from missing updates`. For a nontrivial
change, explain the original problem and any compatibility constraints in the body.

Before committing, review the diff and stage only the intended changes. Run checks
that cover the change: Clippy and tests for Rust code, a manual check for visible
behaviour, and link and wording checks for documentation. Record checks that could
not run rather than treating them as passed.

Add release notes when a change affects users or integrators. Routine editorial
changes do not need an entry. Keep pending notes under `Unreleased`; assign a
version and publication date when preparing the release, without rewriting older
entries. Publishing, pushing and merging are separate steps from a local commit.
