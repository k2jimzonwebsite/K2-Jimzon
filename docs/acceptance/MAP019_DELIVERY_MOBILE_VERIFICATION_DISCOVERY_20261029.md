# Delivery-mobile SMS verification discovery

Owner: MAP-019 / IDEA-20261029-05. Status: **owner-deferred future development due to recurring SMS costs**. Read-only discovery is retained; no implementation, provider activation, deployment or SMS sent.

The owner initially asks to activate SMS/OTP, explicitly selects **Verify delivery numbers only**, and confirms **optional verification initially**. After reviewing Philippine gateway costs, the owner directs: **“if we need to pay skip this for now add this in our future dev in MAseter action plan”**. This supersedes the pending provider-selection question: stop provider qualification and implementation now, retain the scoped future development in MAP-019, and resume only when the owner explicitly reprioritizes it and approves a provider/spending budget. Existing mobile format checks, email/Google sign-in, Auth identity, guest ownership and checkout remain as they are. No checkout restriction is added.

## Direct observations

The owner-controlled environment passes exact-K2 identity verification for `pixplcjqivlfflickobf` and `https://pixplcjqivlfflickobf.supabase.co`. One authenticated Management API **GET** reads only that project's Auth configuration. The durable JSON contains a strict whitelist of non-secret fields and credential-presence booleans; raw configuration, credentials and test OTP values are not retained.

- Phone authentication is disabled; SMS auto-confirm and the custom SMS hook are disabled.
- `sms_provider` is `twilio`, but all inspected provider credential fields are empty. That provider label is a default/selection, not an operational connection.
- No inspected local Twilio, Vonage, MessageBird or TextLocal credentials are present. No account, balance, sender registration, country enablement or deliverability is observed.
- No test-phone override or SMS hook URI is configured.
- Existing `server/storefront-bff/customer-auth.js` has dormant phone **sign-in** handlers. The request calls `signInWithOtp({phone, options:{shouldCreateUser:true}})` and verification yields an Auth session. Those handlers are not a delivery-number verification workflow and must not be enabled to satisfy the selected scope.
- Existing delivery contact is required and format-normalized, saved under the account's address-book revision/idempotency boundary. It is not a verified Auth identity. No source or settings have changed during this discovery.

The unrelated ScoutIT Supabase connector is not used or queried. A management credential demonstrates read capability only; it does not authorize a provider write or paid SMS operation.

## Retained future requirements; development deferred

The retained future scope is delivery-only verification, existing identity preserved, saved-account addresses first, explicit verified/unverified state, invalidation when the number changes, server-only secrets/codes, resend/attempt/spending limits and recoverable SMS delays. Philippine mobiles/current store scale are the initial assumptions to recheck on resumption. Verification would be optional and must not block ordering or guest checkout. No provider purchase, final implementation design or live activation is approved; this is not an active execution dependency.

## Philippine gateway comparison — 29 October 2026

Evidence is official public pricing/documentation retrieved on this date. Published rates are not an account-specific quote or measured delivery benchmark. Keep one short SMS per send; resends/segments increase the cost independently of whether verification succeeds.

| Candidate | Published cost / entry | Integration and unresolved conditions |
| --- | --- | --- |
| Semaphore | Dedicated OTP route: two credits per 160-character message. At the published PHP0.56 credit rate, arithmetic is PHP1.12 per short OTP. Homepage says excluding VAT while FAQ says inclusive; confirm the actual invoice and minimum top-up. | Public send/generate API is documented; it returns the code and has no endpoint rate limit. K2 must protect code handling/checking, expiry and abuse/spend controls. First sender name is free; vendor estimates up to five business days for approval. |
| PhilSMS | Advertises rates **from** PHP0.35/SMS and no minimum top-up. Full pricing is inside its account dashboard; the actual OTP/tier rate and tax treatment are unverified. | Publicly linked legacy API documents sending/status, not an established managed verification-check contract. Confirm current dashboard API before integration. Free sender registration; vendor estimates two to three days. |
| iTexMo | Current homepage starter: PHP2,500 for 5,555 credits, advertised PHP0.45/SMS. Do not treat the unit rate as a PHP450 purchase for 1,000 sends. | Advertises an OTP service; API documentation is supplied by the vendor. OTP-specific route/check lifecycle, rate and tax treatment remain unverified. Registered sender and supporting documents are required. |

Sources: [Semaphore OTP API](https://semaphore.co/docs), [credit price](https://semaphore.co/), [VAT/sender FAQ](https://www.semaphore.co/faq); [PhilSMS pricing and sender FAQ](https://philsms.com/), [linked legacy API](https://app.philsms.com/developers/documentation); [iTexMo current homepage package/FAQ](https://itexmo.com/), [package segmentation](https://www.itexmo.com/index.php/sms-blast-philippines). An older iTexMo API article gives a different starter credit count; the current homepage/package is used here, subject to the actual quote. Public sources establish no carrier-by-carrier delivery speed or successful K2 OTP receipt.

Recommendation (engineering judgment): start provider qualification with Semaphore because its dedicated OTP route and request/response behavior are publicly documented. PhilSMS is the lower-entry-cost alternative if its dashboard confirms a suitable OTP rate/current API. iTexMo requires a larger initial package and further vendor API qualification. This is not a measured reliability ranking. Local send/generate APIs must not be mistaken for Twilio Verify's managed send/check lifecycle.

The provider-selection question is closed by the owner's cost-based deferral; no candidate was selected. No credits were bought, account created, sender submitted, OTP sent or provider/Auth setting changed. MAP-019 retains the future scope and explicit resumption trigger; no provider follow-up or implementation continues automatically. If reprioritized, recheck then-current pricing, actual OTP API/rate/sender readiness and an owner-approved budget before design/activation. Do not send to the saved fabricated Test address number. Vercel custom SMS credentials/account surfaces have not been inspected; absent inspected Auth/local fields do not establish absence of an owner-held gateway account.

Documentation verification: provider arithmetic and citations checked against the official pages; JSON observation remains the unchanged sanitized read-only receipt. No application build or test rerun is warranted for this research/documentation-only change. Recovery removes/reverts only this discovery documentation and its private diagnostic, preserving the existing runtime and unrelated work.

## Official references and boundaries

[Supabase phone sign-in](https://supabase.com/docs/guides/auth/phone-login) requires an SMS provider and recommends rate limits/CAPTCHA to control sending costs. Its Auth flow establishes a phone sign-in identity; it must remain distinct from a parcel-recipient contact in the selected K2 scope. [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser) changes the authenticated user's phone, so it is not a neutral delivery-address update.

[Twilio Verify API](https://www.twilio.com/docs/verify/api) describes a managed verification service and send/check operations. [Current Verify pricing](https://www.twilio.com/en-us/verify/pricing) lists USD0.05 per successful verification plus destination/channel fees. Its listed USD0.0083 SMS example is US pricing, not a Philippine quote. Provider selection, the actual account's rates/credits/permissions and sender/delivery readiness remain unverified. No Twilio account or service was created, billed or inspected.

MAP-019 is the only backlog and marks this scope owner-deferred, outside current execution. If explicitly resumed, first requalify requirements, the chosen approach and provider/budget, complete bounded source/schema/security/UI qualification as applicable, and prepare the exact reviewable activation/recovery packet with named owner authorization, fresh K2 preflight and zero-failed readiness. Existing release `edd115df`, successful CI, dummy Test address/default and four-item cart are preserved. No automatic promotion, Auth change or SMS follows from discovery or this deferral. Recovery here is a scoped documentation/private diagnostic removal; no provider rollback exists because nothing was applied.
