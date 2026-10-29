# MAP-019 account recovery and checkout contact

Owner request: fix the expired guest-link dead end, verify recipient name/mobile/address at checkout, and assess Google/browser autofill. Owner explicitly rejects name suggestions. IDEA-20261029-01 is accepted into existing MAP-019; deletion stays suspended.

The signed-in account and optional guest-history claim are separate. A missing, revoked, exhausted or expired guest grant cannot establish ownership. The maintained claim SQL can return its expiry result for a missing hash too; the UI must not promise that a prior record exists. The repair handles both missing/expired result codes without renewing cookies, claiming by email, changing Auth or retrying the terminal claim automatically.

| Before | Prepared behavior | Why |
| --- | --- | --- |
| Claim fails while the same linking button remains | Clear signed-in status and settings/contact recovery | Offer a usable next step while keeping the ownership check |
| New checkout accepts email alone | Required delivery/pickup mobile with shared saved-address validation | Collect a usable fulfillment contact |
| Generic autocomplete hints | Shipping name/mobile/address hints and stable field names | Let the customer's browser fill saved details |

Full name remains required, with no automatic name suggestions. Address remains required for shipping; pickup retains the existing warehouse destination. Saved addresses already carry recipient name, courier phone and complete canonical destination; no duplicate account-phone column is added. A delivery mobile does not become a verified sign-in identity or activate SMS.

Fresh-form validation uses the same normalizer as saved addresses. Original held requests retain literal contact data and existing BFF/database historical replay handling. This slice changes the new Storefront form policy; it does not change canonical SQL admission or reinterpret past accepted orders. The frontend does not silently normalize a held or manually entered request body.

Google's basic sign-in profile does not provide delivery phone/address. Private People data requires additional scopes and can be absent. Current email-link delivery through Gmail does not grant Google profile access. Browser autofill is user controlled and distinct from a Google account import. No new scopes, People API, Google Console/provider setting or name-suggestion behavior is introduced. Sources: [Google profile fields](https://developers.google.com/identity/openid-connect/reference), [People fields/scopes](https://developers.google.com/people/api/rest/v1/people/get), [Chrome address form guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/autofill-address-form).

Failed-first shared/account/checkout cases are retained. After correction, shared6/account2/checkout1 focused cases and final development exit0/148 pass. The initially proposed name-suggestion tests were removed when the owner explicitly declined that behavior; no suggestion implementation was added. All browser API replies are synthetic, intercepted fixtures. Broader affected checkout/address/recovery tests, bounded visual review, separate builds, authorized source promotion and exact-host proof remain MAP-019; no new UI is claimed live yet.

Recovery is a scoped source revert of this UI/shared-helper/test slice while retaining the working first-party email callback and12-character refresh-token support. Never reset customer identity/roles, renew guest grants, erase unknown request keys or replay SQL/signup/email settings. Unrelated dirty owner images and suspended deletion sources remain untouched. All outstanding execution stays in MAP-019.


29 October continuation: independent review has no Critical/Important findings. Final development exits0/148; shared7, account/wholesale56passed/2skipped, owner/CRM10 and selling94 pass. Checkout recovery is reconciled from39passed plus one corrected focused contact test: its obsolete email-or-mobile alert expectation now checks native required-mobile validity/focus and zero transport. All200 affected browser cases are covered; no clean aggregate release claim. Permitted local execution resolves the sandbox EACCES startup failures. CRM is permanently routed to its Admin-enabled owner config with an empty provider URL and no-watch acceptance setup; no test timeout or product guard was weakened. Failed logs are retained.

The bounded visual review inspected375dark/1440light recovery and375checkout captures with no horizontal overflow, visible recovery actions, readable labels and44px controls. Captures use synthetic contacts/session/API replies, declined analytics and settled theme states; they do not prove real customer saves. Exact candidate builds/packaging/promotion/host proof remain pending. Existing24-stage release evidence is retained for unaffected groups. Vercel connector still403and its consent helper404; the signed-in K2 Vercel dashboard is directly reachable and shows existing productione4ece97d. This newly opened Storefront account tab is signed out; the earlier owner-confirmed login receipt remains valid for its original session.
