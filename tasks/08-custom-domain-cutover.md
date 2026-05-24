# Task: Custom Domain Cutover

## Status

<!-- TODO | IN PROGRESS | DONE | SKIPPED -->
<!-- Detailed state here; PLAN.md checkbox is source of truth for completion -->

TODO

## Requires

- Task 07 must be complete

## Description

Move the custom domain from Lovable to GitHub Pages only after the staged site is approved. The cutover should preserve HTTPS and provide a clear rollback path.

## Proposed Solution

Verify the domain in GitHub, configure the repository's Pages custom domain, update DNS records at the provider, wait for propagation, and enable HTTPS when GitHub makes it available. Prefer a `www` subdomain with an apex redirect unless the final domain choice requires apex as canonical.

## Subtasks

- [ ] Confirm the final canonical domain and whether `www` or apex should be primary.
- [ ] Verify the domain in GitHub Pages settings to reduce takeover risk.
- [ ] Configure the custom domain in the repository's Pages settings after staging approval.
- [ ] Update DNS records at the provider: `CNAME` for `www`, and `A`/`AAAA` or provider-supported `ALIAS`/`ANAME` for apex if needed.
- [ ] Avoid wildcard DNS records.
- [ ] Wait for DNS propagation and enable Enforce HTTPS when available.
- [ ] Verify both canonical and redirecting hostnames.
- [ ] Document rollback steps to restore the previous Lovable DNS records if needed.

## Files to Modify

- `docs/domain-cutover.md` - Domain records, propagation checks, HTTPS status, and rollback plan.
- `README.md` - Production URL after cutover.

## Verification

- [ ] `dig` confirms DNS records point to GitHub Pages.
- [ ] GitHub Pages settings show the custom domain as configured.
- [ ] HTTPS works on the canonical domain.
- [ ] Apex and `www` redirect behavior matches the chosen canonical domain.
- [ ] Archive, Now, Calendar, Compare, Timelapse, and direct deep links work on the custom domain.

## Notes

DNS changes can take up to 24 hours to propagate. Do not start this task until the staged GitHub Pages deployment is fully verified and approved.
