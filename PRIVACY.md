# Privacy and sharing

## What stays in your browser

The app stores the current plan and unfinished onboarding answers in localStorage
on the origin where you opened it. It has no financial-data API, account system,
analytics, advertising, external fonts or third-party runtime scripts. Its
Content Security Policy blocks outbound script connections and form submissions.

This repository contains application code and invented examples, not a dataset
of users' plans. Bank statements, account exports, browser storage, local QA
captures and developer credentials do not belong in commits, issues or releases.

## What the host can see

The Cloudflare Pages host receives normal requests for app files, with ordinary
HTTP metadata such as IP address and browser information. There is no promise of
anonymous network access. The app does not attach entered financial figures to
these requests.

A service worker caches only the static app assets. First loading or downloading
requires a connection. Reopening works offline after the app reports it is ready.

## Share links contain data

Sharing explicitly encodes the configuration in a URL fragment (`#plan=…`). The
fragment is not part of the HTTP request sent to the host, but anyone who receives
the complete link can decode its amounts and labels. It is not encryption. The
link can also remain in browser history, clipboard history or a messaging service.

Opening a shared link previews it. The receiving browser's existing saved plan
is replaced only when its user chooses to keep that shared plan.

## Copying a plan for AI

“複製畀 AI” copies a text summary of your entered amounts, labels, payment
schedules, unconfirmed trials and calculated monthly cash flow to the clipboard.
If clipboard access is unavailable, a selected text field lets you copy manually.
The app does not send the summary to an AI provider. Pasting it into another
service shares it with that service under its own policies; clipboard history
may also retain it. No AI account or API key is needed by this app.

## Local storage has limits

Anyone with access to the browser profile, or software able to read that origin,
may be able to read localStorage. This app does not encrypt it or provide a login
boundary. Browser extensions and shared devices need their own trust decisions.

Clear this site's browser data to remove stored inputs. Clearing caches alone
may not clear localStorage. Different hosts, profiles and downloaded HTML file
locations can have separate storage; private browsing may discard it.

## Report a concern

Follow [SECURITY.md](SECURITY.md) and use invented reproduction data. Never attach
a real plan link, bank document or browser-storage dump to a public issue.
