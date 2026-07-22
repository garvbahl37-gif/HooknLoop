# DNS setup — verify hooknloop.com.au in Resend

To send the newsletter from **info@hooknloop.com.au**, the domain must be verified in
Resend. DNS is managed at **Crazy Domains** (nameservers `ns1/ns2.cheapdomains.com.au`).
The site itself runs on Shopify (`23.227.38.65`) — but DNS records go in **Crazy Domains**,
not Shopify.

The domain is already added to the Resend account (see resend.com/domains → hooknloop.com.au).
Add the 3 records below at Crazy Domains, then verify.

## Where
Crazy Domains → My Account → Manage My Domains → hooknloop.com.au → **DNS → Manage DNS**
→ **Add Record**. Enter the **Name** exactly as shown (Crazy Domains appends the domain).

## Records

| # | Type | Name / Host | Value / Points to | Priority |
|---|------|-------------|-------------------|----------|
| 1 | TXT  | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLwCFfPuy73Rl/0LjWKN9susP+cIshVuWSeFTKlWKroKVCUbF6vAo4u7wgIOp4GmSuvj1jum1k07Ud/XzkxvqyWCks2lEjph/wwgf+ARdERSDbq+U8DLQtXARTFrcadQ+Yawi8rPHpLcQhhs4BjKix0V0KaS3B2mon6VGs9ICFHQIDAQAB` | — |
| 2 | MX   | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| 3 | TXT  | `send` | `v=spf1 include:amazonses.com ~all` | — |

## Do NOT change
- Root SPF `v=spf1 include:_spf.google.com ~all` (Google Workspace email) — leave as is.
- `google-site-verification=…` — leave as is.
- A record → `23.227.38.65` (Shopify) — leave as is.

The Resend records use the `send` subdomain and `resend._domainkey` host, so they don't
conflict with existing Google email.

## Verify
After saving (allow ~5–30 min to propagate):
- Resend dashboard → Domains → hooknloop.com.au → **Verify DNS Records**, or
- via API: `POST https://api.resend.com/domains/dc9a648e-f173-4bec-b23f-a38ee2ad1af9/verify`

Once all three show **Verified**, set/confirm `FROM_EMAIL=info@hooknloop.com.au` (already set)
and sending works to any recipient.
