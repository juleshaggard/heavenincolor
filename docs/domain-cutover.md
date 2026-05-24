# Domain Cutover

## Target

- Canonical domain: `heavenincolor.com`
- GitHub Pages default domain: `juleshaggard.github.io`
- GitHub Pages repository: `juleshaggard/heavenincolor`
- GitHub Pages custom domain setting: `heavenincolor.com`
- GitHub Pages status as of 2026-05-24: custom domain configured, HTTPS enforcement pending DNS cutover

## Current DNS

As of 2026-05-24, the apex domain still points to the previous host:

```text
heavenincolor.com A 185.158.133.1
```

Name servers:

```text
dns1.registrar-servers.com
dns2.registrar-servers.com
```

## Required DNS

At the DNS provider, replace the existing apex `A` record with GitHub Pages records:

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

Add the `www` redirect target:

```text
www CNAME juleshaggard.github.io
```

Do not add wildcard records.

## Verification

After DNS propagation:

```bash
dig heavenincolor.com +short A
dig heavenincolor.com +short AAAA
dig www.heavenincolor.com +short CNAME
curl -I https://heavenincolor.com/
curl -I https://heavenincolor.com/social-preview.jpg
```

When GitHub reports the certificate is ready, enable Enforce HTTPS for the Pages site.

## Rollback

To roll back before the GitHub cutover is healthy, restore the previous apex record:

```text
@ A 185.158.133.1
```

Then remove the custom domain from the GitHub Pages settings if needed.
