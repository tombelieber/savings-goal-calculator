# Contributing

Help people understand a savings plan with fewer inputs. Good contributions
improve clarity, accessibility, calculation accuracy, translations or offline use.
For a large feature, open a short issue describing the user's problem first.

## Start locally

Use Node.js 22+ and Python 3.10+:

```sh
npm ci
npm run build
npm test
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Do not serve the repository root. Never use real financial evidence or a real
browser's saved inputs for development.

## Code and generated files

`calculator-model.js` owns cash-flow math; bill/income/cost modules own their
state. Chart, controls, quick-start and app modules render and connect that state.
`build.py` assembles `calculator-page.html`, styles and scripts into `dist/`,
including CSP hashes, the offline ZIP and service-worker version.

Edit source files, run the build, and commit the resulting `dist/` changes with
them. Keep responsibilities small. There are no frontend framework or runtime
package dependencies. `jsdom` is a test-only dependency.

## Evidence for a change

- Run `npm run build` and `npm test`. Add a focused regression for meaningful
  financial, persistence, sharing or validation changes.
- For visible UI changes, include matching **Before/After** captures with the
  captured revisions and original-size links. Include phone views for responsive
  changes. Refresh them after later edits.
- Use invented amounts and 2099 dates in fixed fixtures and screenshots. Never use
  redacted personal records: invent the case from scratch.
- Keep real plan links, bank files, accounts, local paths, credentials, browser
  exports and private agent notes out of commits and issue/PR text.

The GitHub workflow is a lightweight regression check, not proof of a deployment
or a security certification. Maintainers verify the affected real browser flows
before changing the hosted app.

## Pull requests

Explain the problem, resulting behavior and verification. Keep each PR scoped.
Follow the [code of conduct](CODE_OF_CONDUCT.md). Security issues should follow
[SECURITY.md](SECURITY.md), not a public issue with sensitive details.

Contributions are made under the project's [MIT License](LICENSE).
