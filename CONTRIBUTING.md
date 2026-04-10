# Contributing

Thank you for contributing to Bullshield.

## Before opening an issue

Please check the existing issues first.

For bug reports, include:
- Bullshield version
- browser and browser version
- operating system
- exact steps to reproduce
- expected result
- actual result
- screenshots only if they help and do not expose personal data

For feature requests, describe:
- the concrete problem
- the user-facing benefit
- the preferred behavior
- important constraints

## Before opening a pull request

Run the local checks first:

```bash
npm ci
npm run lint
npm run test
npm run build
```

## Pull request guidelines

Keep changes focused.

Avoid mixing unrelated fixes in one pull request.

When changing behavior, update the relevant documentation in `README.md` or `docs/` in the same pull request.

When changing permissions, privacy behavior, onboarding text, or store-facing claims, also update:
- `docs/chrome-web-store/privacy-practices.md`
- `docs/chrome-web-store/reviewer-notes.md`
- `docs/legal/privacy-policy.md`

## Security issues

Please do not report security issues in public issues.

Follow the instructions in `SECURITY.md`.
