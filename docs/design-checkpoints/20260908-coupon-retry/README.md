# Coupon retry checkpoint — MAP-028 I-002

IDEA-20260908-01. Pre-edit `CouponManager.jsx.before` SHA-256:
`771D626EEF3A575DCEBE55B99BA27C6ED6D5EC2FE84245F14D376062627B22DB`.

Recovery: compare with `src/views/admin/CouponManager.jsx` and reverse only this
dialog/retained-command slice. The Admin actor/role key, shared-hook coupon error
classification and browser fixture/tests are related changes. Preserve later
independent edits. Remaining work and evidence belong to I-002 in the active MAP.
