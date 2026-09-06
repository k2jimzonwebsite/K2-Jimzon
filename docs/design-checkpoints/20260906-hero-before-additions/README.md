# Hero before additive enhancement — 6 September 2026

Owner-requested recovery checkpoint for IDEA-20260906-03 / MAP-028 I-009.
These are exact working-tree copies, including existing uncommitted work,
captured before the hero addition. `sha256.json` records each original hash.

To restore the previous hero from the repository root in PowerShell:

```powershell
Copy-Item -LiteralPath 'docs/design-checkpoints/20260906-hero-before-additions/Hero.jsx' -Destination 'src/components/home/Hero.jsx'
```

This removes the import of the new, isolated `Hero.css`, so its unused file can
remain safely. No reset, checkout, stash or database change is needed. The saved
`index.css` and `FlightMap.jsx` are supporting reference copies; this enhancement
does not edit their originals. Do not overwrite later changes to those files.
Restart the preview and run `npm run build:storefront` after restoration.

This is a local visual checkpoint, not a full repository/database backup or a
deployed release. Current work and remaining acceptance live only in the MAP.
