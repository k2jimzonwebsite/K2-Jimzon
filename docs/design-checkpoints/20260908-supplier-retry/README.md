# Supplier retry checkpoint — MAP-028 I-002

IDEA-20260908-01; pre-edit `Suppliers.jsx.before` SHA-256:
`2A0B787E19BC90756EF37407E4BADEA8424C1B17BB745228F07D1D510DA38C76`.

Compare with `src/views/admin/Suppliers.jsx` and reverse only this retry slice
if recovery is needed. Preserve independent later changes and the protected
supplier service. The Admin caller's actor key and shared hook classification
are part of this slice. Remaining work and evidence live in I-002.
