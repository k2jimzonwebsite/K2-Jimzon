# Product-intake command retry checkpoint — MAP-028 I-002

Captured before the 9 September 2026 intake caller-lifetime changes at repository
commit `41d96df012997cc98751ca405ab632f95ae8806f`.

- `ProductIntakeSessionModal.jsx`: Git blob `d0a8302ae8de4db95eb983b56f29cc80d7f6a0eb`
- `productIntakeService.js`: Git blob `4661a42066674899ec719bb41dc8e32c107c8601`
- `adminBffService.js`: Git blob `1850273836b1c37b4b861c020a062d45f03ff5b0`

Recover by comparing those blobs with the current files and reversing only the
I-002 retained outer-command identity, uncertainty, dismissal and actor-lifetime
changes plus their fixture/spec routing. Preserve separate inner intake request
IDs, all unrelated dirty-tree work, and remaining provider acceptance in I-002.
