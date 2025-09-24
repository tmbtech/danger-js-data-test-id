# danger-js-poc

This repository demonstrates using Danger.js to guard against breaking UI test selectors. It detects changes or removals of data-testid and data-test-id in source code and posts a non-blocking sticky warning on pull requests, tagging the QA team (default: @tmbtech).

## How it works
- A GitHub Actions workflow runs on pull_request events: `.github/workflows/danger.yml`.
- Danger executes `Dangerfile.ts`, which:
  - Scans modified files matching: `src/**/*.{tsx,jsx,ts,js,html}`.
  - Ignores common test/story/build folders (see configuration below).
  - Parses diffs for watched attributes (by default: `data-testid` and `data-test-id`).
  - Reports only changes and removals (additions are ignored).
  - Posts a sticky, non-blocking warning comment and sets a passing commit status with context “Danger”.

## Configuration
- File: `.danger/config.json`
  - `attributeNames`: array of attributes to watch (default: `["data-testid", "data-test-id"]`).
  - `includeGlobs`: file globs to include.
  - `excludeGlobs`: file globs to exclude.
  - `tagTeam`: GitHub handle or team to tag in warnings (default: `@tmbtech`).
- Env override (optional):
  - `DANGER_TESTID_ATTRS` comma-separated list (e.g., `data-testid,data-test-id,qa-id`).
  - Takes precedence over the `attributeNames` value in config for a given run.

## What shows up on a PR
- A sticky, non-blocking comment summarizing every changed/removed selector by file.
- A commit status named “Danger” that is successful but indicates issues were found.
- Neither of these blocks merging by default. If desired in the future, warnings could be turned into failures.

## Permissions and security
- The workflow uses GitHub’s `GITHUB_TOKEN` with:
  - `contents: read`, `pull-requests: write`, and `statuses: write`.
- For pull requests from forks, GitHub may restrict token permissions; comments/statuses might not post. For internal branches, everything works as expected.

## Running locally
- Prerequisites: Node 20+, yarn.
- Install dependencies once:
  - `yarn install`
- Run Danger on an open PR (replace <PR_NUMBER>):
  - `npx danger pr --use-github-pr-api --dangerfile Dangerfile.ts --pr <PR_NUMBER>`
  - Ensure `GITHUB_TOKEN` is available in your shell for API access.
- CI command used in Actions:
  - `yarn danger:ci`

## Updating what is checked
- Change watched attributes: edit `.danger/config.json` → `attributeNames`, or set `DANGER_TESTID_ATTRS` in the workflow/job.
- Change file globs: edit `.danger/config.json` → `includeGlobs` / `excludeGlobs`.
- Change the tagged team: edit `.danger/config.json` → `tagTeam` (e.g., `@your-org/qa-automation`).
- Note: by design we only warn on changes/removals. If you want to include additions later, we can update `Dangerfile.ts` logic.

## Example
- Changing `data-testid="old"` to `data-testid="new"` in `src/App.tsx` will:
  - Add a PR comment tagging `@tmbtech` and listing: `data-testid changed: "old" -> "new"`.
  - Set a passing commit status under the “Danger” context.
- Removing `data-testid` entirely will:
  - Add a PR comment tagging `@tmbtech` and listing: `data-testid removed: "old"`.

### Demo PRs
- Change demo: https://github.com/tmbtech/danger-js-poc/pull/2
- Removal demo: https://github.com/tmbtech/danger-js-poc/pull/3

### Optional screenshots
- You can add screenshots under `docs/images/` and link them here:
  - Comment example: `docs/images/danger-comment.png`
  - Checks panel example: `docs/images/danger-status.png`

## Troubleshooting
- No comment/status on a PR from a fork: expected due to restricted tokens. Test from a branch in this repo.
- No findings but you expected one: verify the file path matches `includeGlobs`, and that the attribute names are included.
- Need different attributes per-repo/team: adjust `.danger/config.json` and commit.

## License
This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
