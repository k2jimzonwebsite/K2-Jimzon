# Catalog import retry checkpoint — MAP-028 I-002

Captured before the 9 September 2026 CSV modal lifetime changes. The component
was clean at repository commit `41d96df012997cc98751ca405ab632f95ae8806f`;
`src/views/admin/BulkCsvImportModal.jsx` had Git blob identity
`90c4479f9030728bd6a41befe9e66bd1a8e9e5b2`.

For recovery, compare that blob with the current component and reverse only the
I-002 uncertain-state, dismissal/mutation lock and disposed-response guards.
Remove the catalog recovery fixture/spec routing only if those behaviors are
also intentionally removed. Preserve every unrelated dirty-tree change and keep
unfinished intake/provider acceptance in the active I-002 MAP item.
