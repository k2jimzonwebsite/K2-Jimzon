# Customer-flow release and BFF activation — 14 October 2026

Owner requests publication of the connected checkout/chat/private-receipt fix and production BFF activation. Owning scope: IDEA-20261014-03, MAP-020/023/025. MAP-018 stays closed. Hostinger owns the existing domain/DNS; Vercel hosts the separate apps; Cloudflare supplies Turnstile. No DNS migration or change is part of this release.

## Prepared configuration and evidence

Correct K2 Vercel connector scope is now reached explicitly through slug `k2-jimzon`, team `team_C3Wf3dVUBjUqGQ4rndMTCchz`. Storefront project `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`; Admin `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`. Both existing production URL configurations resolve to `https://pixplcjqivlfflickobf.supabase.co`. Allowed origins are Storefront www/apex and Admin admin.k2jimzon.com respectively; secure cookies are true; deployment targets remain separate.

Owner-authorized server/browser BFF flags are saved true for each project's next build. Existing signing and session credentials are preserved. Storefront now has the owner-controlled existing `VITE_TURNSTILE_SITE_KEY` and server-only sensitive `K2_TURNSTILE_SECRET_KEY` in Production. No secret value appears in this receipt. Automatic approval rejected returning a production signing credential; it was not read or rotated, and its existing configured behavior must be checked via the real signed read path. A separate Cloudflare validation command was rejected pending destination-specific approval; owner explicitly approved it, and the official siteverify invalid-token probe returns HTTP200 / invalid-input-response, proving the credential is recognized without solving a CAPTCHA or sending customer data.

Signed-in Cloudflare directly shows K2 Storefront public site key `0x4AAAAAAFVraDHxm1pjdbBc`, matching saved Vercel public configuration, Managed mode, www.k2jimzon.com and k2jimzon.com hostnames, pre-clearance off. K2 Admin BOS public site key `0x4AAAAAAFGYGSrlT_a5NOrQ` has admin.k2jimzon.com plus its two preexisting preview hosts, Managed mode and pre-clearance off. No Cloudflare host, key or widget setting changed.

Only the disabled-BFF404 rule is staged off for each project; security-header rules are unchanged. Storefront staged route version7cd500d1-3323-4428-9426-a2d2865b5100; existing live versionb81157d4-2c21-40a6-b03c-987537e31678. Admin staged versiona642d086-ad20-4fa6-95e3-3fa9d7f7590b; existing live versionfd4bbb6a-0db4-49d1-b5e8-a5060f7a3b41. Staging alone does not activate APIs. Promote the reviewed staged versions only after deployment readiness.

Readiness snapshot now admits only the exact approved25th anonymous order-chat adapter alongside the prior24 grants and two invoker triggers. The historical13October snapshot is preserved. New readiness regression first fails and then14/14passes, including altered overload/owner/definer/result/PUBLIC denials. Final development gate passes. Fresh K2 identity and readiness7verified/2owner/3script-unreached/0failed. Native order chat/proof/staff retrieval and data-retaining rollback passes. Actual runtime/host acceptance remains separate.

## Inventory boundary

The owner-supplied source is preserved at `.tools/map018-hosted-draft-import-20261013-01/owner-source-partial-drafts.csv`:196draft product groups. All196currently lack primary images, descriptions and SEO keywords in that prepared import. These are provisional source facts, not production-ready listings or verified stock. Existing preparation also flags42groups without a selling price and separate source stock rows requiring reconciliation. Owner explicitly says the inventory needs imagery and SEO descriptions before intended use. Preserve it for draft intake; do not auto-publish, invent packaging/product claims, synthesize stock or treat blank fields as accepted. Product assets/facts/prices/SEO and stock acceptance remain distinct from this BFF activation.

## Release and recovery

Complete release gate invoked once in `.tools/customer-live-release-20261014.log`; final receipt will record its terminal result and exact promoted SHA/deployments. Prepared-only state above must not be described as deployed until host checks pass.

Recovery: restore the two prior live routing versions above to close the APIs while retaining all canonical data. Restore BFF server/browser flags false and redeploy each artifact if a complete deactivation is needed; preserve signing/session credentials and receiving proofs. Restore prior application deployments D9ip2w6eh6utGMMNtU9QwsvjAgSj /3yY9qZkM3KeMksWa6bFKbKctDxPV if appropriate. The separately approved DB adapter rollback remains scoped to its function and retains orders/messages/proofs. Do not repeat the canonical installer.
