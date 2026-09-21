# Admin clarity and workflow guide audit

Date: 21 September 2026
Idea: IDEA-20260921-03
Owners: MAP-028 I-012/I-016 and MAP-025

## Request

Verify the full Admin BOS for understandable staff wording, simple instructions,
a working workflow map, and usable phone and desktop layouts.

## Confirmed problems and changes

| Before | After | Why |
| --- | --- | --- |
| The sidebar, command palette, modal, and guide used both `Workflow Graph` and `Workflow map`. | Every staff entry point says `Workflow map`. | Staff should search for one name. |
| 40 of 46 workflow steps named controls that do not exist in Admin. | Every quoted control is checked against a real staff-facing label. Unsupported work begins with `No Admin control yet.` and names the approved manual boundary. | The guide must not send staff to invented buttons or imply future work is active. |
| Custody steps opened Inventory, count steps opened Inventory, and stock allocation opened Inventory. | Custody opens Fulfillment Hub, count work opens Owner Count & Close, and stock allocation opens Channel Readiness. | Each guide jump now lands in the workspace that owns the action. |
| Fallback help used phrases such as `designated screen`, `downstream operational stage`, and `server result`. | Fallbacks say `named screen`, `next step`, and `saved record`. | Keep instructions readable without weakening the save check. |
| Several visible messages used `persisted`, `immutable`, `canonical register`, `bounded route`, and `attributable reason`. | Staff copy uses `saved`, `permanent history`, `saved yet`, `protected screen`, and `reason you entered`. | Internal implementation terms do not help staff finish the task. |
| Some guide and Start Here controls were below the 44px interaction floor. | Those controls now use the existing 44px Admin target size. | Preserve phone and keyboard usability. |
| Help near the left edge could show a native title over the custom tooltip and clip toward the sidebar. | The shared tooltip has one readable 14px panel, opens into the workspace, and has no duplicate native title. | Staff must be able to read help wherever the shared control appears. |
| Purchasing and consignment were easy to confuse. | The Purchasing screen and glossary state that purchase orders are supplier commitments while consignments are physical movement. | Staff need to choose the right record before scanning or receiving. |
| The built-in guide did not explain every Admin screen. | Eighteen searchable glossary entries name each screen, its use, and one concrete scenario. | New staff can learn inside the existing grounded guide without an external AI service. |
| The Milan instant action required a second arming tap despite its one-tap label. | The owner-approved action writes on one tap and immediately shows the created SKU and item receipt. | Keep the frequent scan fast while making the result visible for correction. |

## Evidence

- Failing-first evidence: `tests/workflow-guide-truth.spec.js` initially failed
  on the invented `Log Store Purchase` control and on technical fallback text.
- Focused Admin language, workflow, tour, and staff procedure contracts:
  43/43 passed.
- Full browser Admin suite: 35/35 passed after the current direct Globe transport
  was injected into its fixture. Coverage includes 375px and desktop layouts,
  keyboard help, overflow, Globe review editing, staff roles, product media,
  intake, channel readiness, authentication, and URL navigation.
- Complete release suite: 1,129/1,129 passed through the top-level `npm test`
  command, including the Storefront, Admin, payment recovery, Inbox, product
  master, owner close, customer account, workflow API, and intake journeys.
- `npm run build:admin`: passed, including security prebuild, source boundary,
  import integrity, production boundary, 211.67 kB / 300.00 kB Admin budget,
  and built bundle secret scan.
- `npm run build:storefront`: passed at 150.16 kB / 150.50 kB gzip JS and
  29.34 kB / 30.00 kB gzip CSS, including the same security gates.

The first browser attempt failed because Windows refused to launch Chromium with
`spawn EPERM`. The suite was rerun with permission to launch the local browser.
The release run exposed stale tab and wording expectations in wholesale and
Inbox tests; those fixtures were aligned with the current visible workflow, and
the final uninterrupted top-level run passed all 1,129 checks.

## Limits and next action

Production release `36bbfa4` passed GitHub CI run `35586397300`; both Vercel
projects succeeded, both canonical build markers returned the correct target,
and the live Admin bundle contains the Workflow map release. This does not prove
representative staff comprehension, physical phone behavior, or authenticated
write behavior. MAP-025 still requires a Staff-role and Admin-role reviewer to
open one map step, locate the named control without coaching, explain the next
action in their own words, and complete the allowed task without choosing the
wrong record.

## Recovery

Revert the IDEA-20260921-03 copy, route, guide-data, and test changes listed in
the current diff. Keep the separate Globe direct-RPC security work and the prior
`GlobeOverlay.jsx` change. No database or provider rollback is required for this
clarity audit.
