# Security policy

The current `main` branch and maintained Cloudflare instance are the supported
surfaces. Older downloaded HTML copies do not update themselves; download a new
copy when a fix is available. No response-time guarantee or independent security
audit is claimed.

## Reporting a vulnerability

Do not disclose exploit details, real financial values or real share links in a
public issue. Use GitHub's **Report a vulnerability** button when it is available
on this repository's Security/Advisories page:

https://github.com/tombelieber/savings-goal-calculator/security/advisories

If private reporting is unavailable, open an issue that only asks the maintainer
for a private security contact. Include no vulnerability details or personal data
in that request. Repository visibility and GitHub feature availability can affect
which reporting controls appear.

For a private report, provide the affected revision/URL, browser, impact and
minimal reproduction with invented data. Give maintainers time to investigate
before public disclosure.

## Scope and boundaries

Relevant issues include script injection, malformed share payload handling,
unexpected financial-data transmission, unsafe offline caching and accidental
private-data inclusion in source/distribution. Calculation bugs that do not expose
information can use the normal bug-report form with fictional inputs.

Local storage and share fragments are not encryption or an authentication boundary.
Anyone with a plan link can read it. See [PRIVACY.md](PRIVACY.md) for the supported
privacy model and limitations. Do not send raw bank documents to this project.
