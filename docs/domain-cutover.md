# Domain Cutover

## Target

- Canonical domain: `heavenincolor.com`
- GitHub Pages default domain: `juleshaggard.github.io`
- GitHub Pages repository: `juleshaggard/heavenincolor`
- GitHub Pages custom domain setting: `heavenincolor.com`
- GitHub Pages status as of 2026-05-24: custom domain configured, DNS cutover complete, HTTPS enforced

## Current DNS

As of 2026-05-24, the authoritative nameservers return GitHub Pages records for the apex domain:

```text
heavenincolor.com A 185.199.108.153
heavenincolor.com A 185.199.109.153
heavenincolor.com A 185.199.110.153
heavenincolor.com A 185.199.111.153
www.heavenincolor.com CNAME juleshaggard.github.io
```

Name servers:

```text
dns1.registrar-servers.com
dns2.registrar-servers.com
```

During cutover, some recursive resolvers briefly retained the previous apex record:

```text
heavenincolor.com A 185.158.133.1
```

## Required DNS

At the DNS provider, the apex `A` record should be GitHub Pages records:

```text
@ A 185.199.108.153
@ A 185.199.109.153
@ A 185.199.110.153
@ A 185.199.111.153
```

Add IPv6 records if the provider supports them:

```text
@ AAAA 2606:50c0:8000::153
@ AAAA 2606:50c0:8001::153
@ AAAA 2606:50c0:8002::153
@ AAAA 2606:50c0:8003::153
```

The `www` redirect target should be:

```text
www CNAME juleshaggard.github.io
```

Do not add wildcard records.

## Verification

Verified on 2026-05-24:

```bash
dig heavenincolor.com +short A
dig heavenincolor.com +short AAAA
dig www.heavenincolor.com +short CNAME
curl -I https://heavenincolor.com/
curl -I https://www.heavenincolor.com/
curl -I https://heavenincolor.com/social-preview.jpg
```

The GitHub Pages certificate is approved for `heavenincolor.com` and `www.heavenincolor.com`, and Enforce HTTPS is enabled. The `www` subdomain redirects to the apex domain.

## Rollback

To roll back before the GitHub cutover is healthy, restore the previous apex record:

```text
@ A 185.158.133.1
```

Then remove the custom domain from the GitHub Pages settings if needed.
