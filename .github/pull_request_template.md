## Summary

<!-- What changed and why (1–3 sentences) -->

## Test plan

- [ ] `npm run build` + `npx tsc --noEmit`
- [ ] `cd src-tauri && cargo check && cargo clippy --release -- -D warnings && cargo test`
- [ ] Manual check if UI-visible (screenshot or steps)

## Docs

- [ ] User-visible change → `README.md` + bullet under **`CHANGELOG.md`** → `[Unreleased]` (**For you** + **Technical details**)
- [ ] Contributor / architecture → `docs/DEVELOPMENT.md`
