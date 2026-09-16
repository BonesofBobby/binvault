# Release preparation checklist

Use this for the RC and repeat it for a final release. No tag or GitHub Release is created by this milestone.

For this RC preparation branch, the expected starting HEAD is `943e3954292e86d314eeb4d0575940e3db646db6` on `feature/v1-release-preparation`; confirm it has not moved unexpectedly before review.

- [ ] Confirm branch, clean intended diff, expected base/HEAD, and version in `package.json` and lockfile root.
- [ ] Verify Prisma schema and migrations have no surprises; run `npx prisma validate`.
- [ ] Run `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, and `git diff --check`.
- [ ] Run `npm audit`; record exact severity counts, dependency paths, and disposition before release.
- [ ] Check repository hygiene: no DB/sidecars, uploads, ZIPs, secrets, recovery artifacts, `.next`, or temp data staged.
- [ ] Prove shell/file production environment precedence and identical DB target for Next, production CLI, restore/recover CLI, and explicit production Prisma migrate; confirm offline archive validation works without production configuration.
- [ ] From a clean disposable checkout, run `npm ci`, Prisma generate, `production:check`, guarded `production:init`, explicit migrate deploy, `production:ready`, tests, lint, TypeScript, Prisma validation, and production build.
- [ ] Smoke-test `production:start`, `/api/health` and `/api/ready` HTTP 200, and reported canonical version.
- [ ] Create/validate a disposable backup; perform a stopped-app disposable restore drill and verify DB/media.
- [ ] Confirm Node 22 and Node 24 fresh-install CI jobs and security workflow checks.
- [ ] Review README, production/recovery docs, RC notes, scope, known limitations, and third-party font notice.
- [ ] Confirm project licensing decision (currently no project-level open-source license); review bundled font OFL.
- [ ] Before an RC tag/release, confirm unique tag, exact target commit, and GitHub Release **prerelease** flag.
- [ ] Before a final v1.0.0 tag/release, resolve the preexisting historical `v1.0.0` tag and unrelated CJEF GitHub Release through an explicit owner decision; then repeat validation and confirm final target commit and non-prerelease metadata.
