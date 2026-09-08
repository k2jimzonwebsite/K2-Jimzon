# Wholesale retry checkpoint — MAP-028 I-002

Continuation under IDEA-20260908-01. Customers.jsx.before SHA-256:
`92E86A1D89CC88B5E37C206A1FBE9C3693E7EAAF2A3AB9A451673B60B44A8729`.

Compare with src/views/admin/Customers.jsx and reverse only the triage recovery
slice. Related changes are the review wrapper key, shared hook error category,
Admin actor key, isolated fixture/spec and its runner routing. Preserve other
work. Remaining actions and evidence belong in the active MAP I-002 item.
