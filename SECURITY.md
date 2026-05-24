# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a vulnerability

If you discover a security issue in Koi Monitor, please **do not** open a public GitHub issue with exploit details.

Instead, open a [GitHub Security Advisory](https://github.com/KatanaCZ/Koi-Monitor/security/advisories/new) or contact the maintainer privately.

Include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Impact assessment (local-only app, no remote account)

We aim to acknowledge reports within **7 days** and provide a fix or mitigation plan when possible.

## Scope notes

Koi Monitor is a **local Windows desktop app**. It does not collect telemetry, sync data to the cloud, or expose a network service. Reports about DNS ping targets, driver scan permissions, or WebView2 CSP are in scope when they affect local security or user data on disk.
