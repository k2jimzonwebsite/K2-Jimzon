# Checkout delivery checkpoint — MAP-028 I-003

IDEA-20260908-01; `Checkout.jsx.before` preserves the local file before removal
of the unbound fee-inclusive total and final-charge promise. SHA-256:
`54BAD484E93696B42981D46687B74183275FA4FFA72C3EA72F4CB9C74CCA5A51`.

For recovery compare with `src/views/Checkout.jsx` and reverse only this scoped
change, preserving subsequent work. Do not enable the prepared delivery pilot
until the accepted fee is bound to the canonical order. Remaining work and
verification live only in I-003 in the Master Action Plan.
