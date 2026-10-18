# Nimble Options Filter

A Foundry VTT v14 module for the **Nimble** system. The GM chooses which **classes, ancestries, ancestry bonuses and backgrounds** are hidden from the character creation dialog (Create Actor → Character). Hidden options are removed for everyone, GMs included, and can be unhidden at any time. The module bundles no content.

## Requirements

- Foundry VTT v14
- Nimble system 0.9.0 or newer

## Usage

1. Open **Game Settings → Configure Settings → Nimble Options Filter** and click **Choose Hidden Options** (GM only).
2. Pick a tab (Classes, Ancestries, Ancestry Bonuses, Backgrounds) and tick **Hide** on anything you want removed. Common options are listed first, exotic ones after. Options come from your world Items and every installed Item compendium.
3. Use the search box to find options, and **Show hidden only** to review what you have hidden.
4. **Reset to default** (per tab) shows every common option and hides the exotic ones.
5. Click **Save**. The window closes and the change applies the next time a creation dialog opens.

### Rules to know

- **An ancestry needs its default bonus.** If you hide an ancestry's default bonus, that ancestry is hidden too (shown greyed out in the manager). Unhide the bonus and the ancestry returns. Hiding an ancestry does not hide its bonus.
- **Exotic bonuses.** An ancestry bonus counts as exotic when it is the default bonus of an exotic ancestry.
- **You can't hide everything.** Save is disabled while any tab has every option hidden, since the dialog would have nothing to pick.
- The first time the creation dialog opens after a world loads, it briefly closes and reopens so the filter can take effect.

## Notes

- This declutters the dialog. It is not a security boundary: players can still add items manually.
- The module relies on internals of Nimble's character creation dialog. If a Nimble update changes them, the module warns the GM instead of erroring, and the dialog is left unfiltered. Please report it.
- Stat arrays, languages, class features, spells and equipment are not filtered.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md). Run tests with `npm install` then `npm test`.
