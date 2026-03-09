# CSRF Protection with Astro Behind Docker/Nginx

## How Astro's CSRF Check Works

On POST requests, Astro compares the `Origin` header against a URL it reconstructs from forwarded headers:

1. Reads `X-Forwarded-Proto` and `X-Forwarded-Host`
2. Builds a URL: `{proto}://{host}`
3. Compares it to the `Origin` header
4. **Mismatch = 403 "Cross site POST form submissions are forbidden"**

This means `X-Forwarded-Proto` must exactly match the protocol the browser used — not the protocol of any internal hop.

## The Multi-Proxy Pitfall

Production network path:

```
Browser (HTTPS) → TLS proxy → nginx (HTTP) → Astro
```

The TLS proxy correctly sets `X-Forwarded-Proto: https`. But nginx's `$scheme` reflects *its own incoming connection* (`http`), not the original client protocol. Using `proxy_set_header X-Forwarded-Proto $scheme` overwrites `https` with `http`, causing:

```
Reconstructed: http://example.com
Origin:        https://example.com  ← 403
```

## The Fix

Use an nginx `map` to prefer the upstream value, falling back to `$scheme` for direct access:

```nginx
map $http_x_forwarded_proto $forwarded_proto {
    default $http_x_forwarded_proto;   # preserve upstream TLS proxy's value
    ''      $scheme;                    # fallback when no upstream proxy
}

# In location blocks:
proxy_set_header X-Forwarded-Proto $forwarded_proto;
```

## Debugging Landmines

- **`security.allowedDomains` is a red herring.** Astro's CSRF check compares Origin against *the reconstructed URL from headers*, not a config allowlist. If the protocol is wrong, no domain config will help.
- **`$http_x_forwarded_proto` vs `$scheme`** — the former passes through what upstream set; the latter reflects the nginx listener. Know which you need.
- **Don't add debug wrappers to production entrypoints.** We added a `debug-entry.mjs` wrapper to log headers, which meant extra files in the Dockerfile and conditional logic in the start script — easy to forget to clean up. Instead, use `docker exec` to curl localhost with `-v`, or temporarily add a `/debug-headers` endpoint.

## Quick Checklist for CSRF 403s

1. **Check headers reaching Astro** — `docker exec <container> wget -qS --post-data='' http://localhost:4321/login 2>&1` or add a temp debug route
2. **Verify `X-Forwarded-Proto`** — must match the browser's protocol (`https` in production)
3. **Verify `Origin` header is forwarded** — nginx strips it by default in some configs; explicitly forward with `proxy_set_header Origin $http_origin`
4. **Trace the proxy chain** — identify every hop and check if any overwrites forwarded headers
5. **Check Astro version** — CSRF protection was added in Astro 4.x; `security.checkOrigin` defaults to `true` in SSR mode
