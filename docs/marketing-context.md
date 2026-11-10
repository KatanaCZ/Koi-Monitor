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
