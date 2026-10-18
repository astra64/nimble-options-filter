# Changelog

## 0.1.0 - 2026-10-18

First release. Verified on Foundry v14 with Nimble 0.9.0.

- Hide classes, ancestries, ancestry bonuses and backgrounds from the Nimble character creation dialog, for all users including GMs.
- GM-only manager (module settings menu) with tabs, search, "show hidden only", per-tab **Reset to default**, unsaved-changes indicator, Revert and Save.
- Lists world Items and all Item compendium entries; common options first, then exotic.
- An ancestry is hidden whenever its default bonus is hidden. Default bonuses of exotic ancestries count as exotic.
- Empty core/exotic ancestry sections are removed from the dialog instead of showing a bare heading.
- Save is blocked while any category has every option hidden.
- Fails soft with a GM warning if Nimble's dialog internals change.
