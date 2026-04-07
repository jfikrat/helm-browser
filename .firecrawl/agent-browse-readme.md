[Skip to content](https://github.com/browserbase/skills#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/browserbase/skills) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/browserbase/skills) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/browserbase/skills) to refresh your session.Dismiss alert

{{ message }}

[browserbase](https://github.com/browserbase)/ **[skills](https://github.com/browserbase/skills)** Public

- [Notifications](https://github.com/login?return_to=%2Fbrowserbase%2Fskills) You must be signed in to change notification settings
- [Fork\\
40](https://github.com/login?return_to=%2Fbrowserbase%2Fskills)
- [Star\\
500](https://github.com/login?return_to=%2Fbrowserbase%2Fskills)


main

[**64** Branches](https://github.com/browserbase/skills/branches) [**0** Tags](https://github.com/browserbase/skills/tags)

[Go to Branches page](https://github.com/browserbase/skills/branches)[Go to Tags page](https://github.com/browserbase/skills/tags)

Go to file

Code

Open more actions menu

## Folders and files

| Name | Name | Last commit message | Last commit date |
| --- | --- | --- | --- |
| ## Latest commit<br>[![aq17](https://avatars.githubusercontent.com/u/54565933?v=4&size=40)](https://github.com/aq17)[aq17](https://github.com/browserbase/skills/commits?author=aq17)<br>[Add 5 new skills to README (](https://github.com/browserbase/skills/commit/ddf8833dc400b46df968a614e109273836c376c6) [#67](https://github.com/browserbase/skills/pull/67) [)](https://github.com/browserbase/skills/commit/ddf8833dc400b46df968a614e109273836c376c6)<br>4 days agoApr 3, 2026<br>[ddf8833](https://github.com/browserbase/skills/commit/ddf8833dc400b46df968a614e109273836c376c6) · 4 days agoApr 3, 2026<br>## History<br>[38 Commits](https://github.com/browserbase/skills/commits/main/) <br>Open commit details<br>[View commit history for this file.](https://github.com/browserbase/skills/commits/main/) 38 Commits |
| [.claude-plugin](https://github.com/browserbase/skills/tree/main/.claude-plugin ".claude-plugin") | [.claude-plugin](https://github.com/browserbase/skills/tree/main/.claude-plugin ".claude-plugin") | [Add browserbase-cli skill (](https://github.com/browserbase/skills/commit/65e98e60990fbd3dc962326d3d196de28ea02bb1 "Add browserbase-cli skill (#45)  * Add browserbase-cli skill  * Scope BROWSERBASE_PROJECT_ID requirement to functions dev/publish only  Most bb commands only need BROWSERBASE_API_KEY. Project ID is only strictly required by `bb functions dev` and `bb functions publish`.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add missing bb skills command docs and clarify bb browse passthrough  - Document `bb skills install` in both REFERENCE.md and SKILL.md - Clarify that `bb browse` examples are browse-cli subcommands forwarded   through the passthrough, not native bb commands  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Fix --q query format in sessions list example  The API requires user_metadata['key']:'value' format, not the simplified key:value shown before.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") [#45](https://github.com/browserbase/skills/pull/45) [)](https://github.com/browserbase/skills/commit/65e98e60990fbd3dc962326d3d196de28ea02bb1 "Add browserbase-cli skill (#45)  * Add browserbase-cli skill  * Scope BROWSERBASE_PROJECT_ID requirement to functions dev/publish only  Most bb commands only need BROWSERBASE_API_KEY. Project ID is only strictly required by `bb functions dev` and `bb functions publish`.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add missing bb skills command docs and clarify bb browse passthrough  - Document `bb skills install` in both REFERENCE.md and SKILL.md - Clarify that `bb browse` examples are browse-cli subcommands forwarded   through the passthrough, not native bb commands  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Fix --q query format in sessions list example  The API requires user_metadata['key']:'value' format, not the simplified key:value shown before.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") | 3 weeks agoMar 16, 2026 |
| [agent](https://github.com/browserbase/skills/tree/main/agent "agent") | [agent](https://github.com/browserbase/skills/tree/main/agent "agent") | [add agent-browse](https://github.com/browserbase/skills/commit/22dbb79efb93dec16f69e419170c9579cc64e313 "add agent-browse") | 6 months agoOct 12, 2025 |
| [skills](https://github.com/browserbase/skills/tree/main/skills "skills") | [skills](https://github.com/browserbase/skills/tree/main/skills "skills") | [\[STG-1745\] Add ui-test skill — adversarial UI testing with browse CLI (](https://github.com/browserbase/skills/commit/cb4c772e21861fd8e184b456664db36591ab878e "[STG-1745] Add ui-test skill — adversarial UI testing with browse CLI (#56)  * Add ui-test skill — adversarial UI testing with browse CLI  Builds on #52 with three key additions:  1. Local/remote mode selection — localhost uses local browser (no API key),    deployed sites use Browserbase via cookie-sync for authenticated testing  2. Diff-driven testing — analyze git diff, generate targeted tests for what    changed, execute with before/after snapshot comparison  3. Structured assertion protocol — STEP_PASS/STEP_FAIL markers with evidence,    deterministic checks (axe-core, console errors, overflow detection), and    adversarial testing patterns (XSS, empty submit, rapid click, keyboard-only)  Smoke-tested against a local Next.js app: found real bugs (Escape not closing modals, undersized mobile touch targets) that confirmed the adversarial patterns work. Fixed browse eval recipes (no top-level await, console capture on-page not about:blank).  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add parallel testing workflow (Workflow C) using Browserbase named sessions  Enables concurrent test execution by leveraging browse CLI's --session flag to spin up independent Browserbase browsers per test group, with fan-out via Agent tool and merged result reporting.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Add permission setup docs to avoid approval fatigue on browse commands  Documents how to add Bash(browse:*) to project or user settings so users don't get prompted on every browse snapshot/click/eval.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Strip YAML suite format and simplify codebase analysis — let the agent figure it out  - Remove .ui-tests/suite.yml format and generation pipeline - Replace Workflow B (8-step codebase analysis) with lightweight exploratory testing - Simplify references/codebase-analysis.md to quick hints (framework detection, route finding) - Remove example YAML suite file - Update README to reflect no-artifacts philosophy - Drop Write tool from allowed-tools (no files to generate)  The codegen/suite approach can ship as v2 later.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Fix 3 bugs from Cursor Bugbot review  - XSS check: replace false-positive inline script count with input value check - Console capture: preserve original console.error in Examples 6 snippets - Form labels: use native i.labels API in browser-recipes.md (matches SKILL.md)  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Add permission setup docs to avoid approval fatigue on browse commands  Also strengthens auto-select rule: localhost → browse env local, deployed URLs → browse env remote, applied consistently across all workflows including parallel sessions.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Simplify env rule: just say localhost → local, don't prescribe remote  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Fix parallel testing docs: works locally too, fix permission patterns  - Remove \"remote only\" restriction — named sessions work with local mode - Add BROWSE_SESSION=* permission pattern to avoid approval fatigue on parallel runs  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Add design consistency checks — learn taste from the app itself  If references/design-system.md exists, use it as ground truth. Otherwise, screenshot 2-3 existing pages to establish baseline patterns (spacing, radii, colors, typography) and compare the changed page against them.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Add screenshot capture on failure for visual bug evidence  When a test step fails, the skill now instructs the agent to take a screenshot and save it to .context/ui-test-screenshots/<step-id>.png, referenced in the STEP_FAIL marker and final report so developers can see exactly what went wrong.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Add Browserbase design system reference for taste-aware testing  Extracted from browserbase-brand-guidelines skill: colors, typography, border radii, spacing grid, component patterns, and visual principles. The ui-test skill checks changed pages against this when it exists.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Restructure budget system for sub-agent architecture  Rewrite Budget & Limits section to use a coordinator/sub-agent model: main agent plans and delegates, sub-agents do the actual testing with a 20-step hard cap each. Wall clock target ~10 min for default runs.  * Add craft quality judgement and luck lens for deeper UI evaluation  Integrates two external frameworks into the testing skill:  - Judgement (Emil Kowalski + Josh Puckett + UI Wiki): 9 reference files   covering animations, forms, touch/a11y, typography, polish, component   design, marketing, performance, and 152 UI wiki rules. Adds deterministic   eval checks for touch targets, iOS zoom, transition:all, z-index abuse,   and form labels. Adds screenshot-based critique methodology.  - Luck (soleio): Assembly Theory meta-evaluation lens — 7 facets adapted   to UI (solvency, gradient coupling, compatibility, niche construction,   circulation, integration, path sensitivity) for \"will this UI thrive?\"  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Remove craft quality judgement and luck lens to keep skill focused  Strip out the Craft Quality Judgement section, Luck Lens meta-evaluation, and all references/judgement/ files. Keep the skill focused on functional testing, accessibility, and UX heuristics.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Make design-system.md a user-provided file, ship example as template  Rename design-system.md → design-system.example.md with instructions for users to copy and fill in their own brand tokens. The skill reads design-system.md (user-created), not the example.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Fix 5 bugs from Cursor Bugbot review (round 2)  - Add browse wait timeout 3000 after axe-core script injection (SKILL.md, browser-recipes.md) - Fix form label check to include aria-label and aria-labelledby (SKILL.md) - Fix focus ring detection to check box-shadow too, not just outline (browser-recipes.md) - Fix window.__capturedErrors → window.__logs in Example 8 (EXAMPLES.md) - design-system.md already fixed in prior commit (renamed to .example.md)  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Remove codebase-analysis.md — not needed without test generation flow  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Fix 3 more Bugbot issues: aria-labelledby, axe-core wait in examples  - Add aria-labelledby to hasLabel check in browser-recipes.md - Add browse wait timeout 3000 after axe-core injection in Examples 4 and 7 - hasFocus box-shadow check was already fixed in prior commit  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Refactor SKILL.md for agentskills.io spec compliance (→459 lines)  - Fix allowed-tools delimiter: commas → spaces per spec - Extract adversarial patterns → references/adversarial-patterns.md - Extract parallel testing → references/parallel-testing.md - Extract design consistency → references/design-consistency.md - Replace inline deterministic checks with summary table + link - Move rules/ux-heuristics.md → references/ (eliminate non-standard dir) - Add conditional loading triggers for all reference files - Update README.md file tree  Zero content lost — all extracted sections live in reference files with \"when to load\" guidance for progressive disclosure.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * fix: remove inaccurate time math from budget section  Drop the \"~30 seconds per browse command\" claim and all derived wall clock estimates. Budget is now defined purely in steps/turns, which is the actual constraint that caps spend.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * feat: add HTML report generation (Phase 7) with embedded screenshots  Adds a self-contained HTML report that reviewers can open in a browser. Screenshots are base64-embedded so the file works offline as a single artifact. Failed tests render open by default with inline screenshots; passed tests are collapsed.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * style: apply Browserbase brand guidelines to HTML report template  Light theme with warm off-white (#F9F6F4) background, Inter font via Google Fonts, brand orange-red (#F03603) for failures, brand green (#90C94D) for passes, brand blue (#4DA9E4) for suggestions. Inline Browserbase logo SVG in header and footer. Borders over shadows per brand design system.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * fix: make header logo link to browserbase.com with \"Powered by\" label  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * Add multi-sweep testing for more consistent bug discovery  Restructure test runs into 2-3 sweeps from different angles: 1. Deterministic sweep: fixed checklist (axe-core, console errors, etc.) — same results every run 2. Exploratory-functional: interactions, edge cases, adversarial inputs 3. Exploratory-visual: responsive layout, keyboard nav, design consistency  Also adds mandatory page discovery step so every route gets covered. This addresses the inconsistency where repeated runs surface different bugs.  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>  * Revert \"Add multi-sweep testing for more consistent bug discovery\"  This reverts commit 379e4af97640376763aeb9e9aefc200c4a221690.  * docs(ui-test): align local env guidance with browse CLI  * Rework budget system: principles over fixed numbers, multi-angle planning  - Replace rigid budget tables (20 steps, 5 agents, quick/default/thorough   modes) with guiding principles the agent uses to size effort itself - Add multi-angle planning flow: plan from 3 perspectives, deduplicate,   execute once — produces broad coverage without re-running same checks - Keep 20-step safety valve as a runaway cap, not a target - Remove adjusting-the-budget modes entirely — one way of testing  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * Enforce multi-angle planning as a required step before execution  Make the three planning rounds mandatory and output-visible — the agent must write out all three rounds and the merged plan before it's allowed to launch any sub-agents. Prevents skipping straight to execution.  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * Fix planning/execution split: planning in main agent, not sub-agents  - Planning rounds happen in the main agent's own response, never delegated - Sub-agents receive a specific numbered test list and run only those tests - Sub-agents do not explore or plan — execute assigned tests and stop - Add explicit step budget requirement in every sub-agent prompt - Step heuristics (25/40/75) are starting points, not rules  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * Prevent sub-agents from generating HTML reports  Sub-agents must return only STEP_PASS/STEP_FAIL markers as text. Only the coordinating main agent generates the final HTML report.  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * Replace \"steps\" with \"tests\" in reporting — steps are plumbing, not metrics  - Report header: Tests | Passed | Failed | Agents (not Total Steps) - Replace {{TOTAL_STEPS}} with {{TOTAL_TESTS}}, add {{AGENT_COUNT}} - Remove redundant {{TEST_COUNT}} placeholder  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * Add STEP_SKIP for budget hits, prevent main agent retries  - Sub-agents report STEP_SKIP|<id>|budget reached for unfinished tests - Main agent accepts partial results as-is, never re-runs sub-agents - Add 25/40/75 step heuristics to sub-agent budget guidance - Skipped tests appear in final report so developer knows coverage gaps  Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>  * feat: add clickable PR link in HTML report title  The report h1 now uses {{TITLE_HTML}} which supports wrapping PR references in <a> tags. Link styled in brand red with underline on hover.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  * fix(ui-test): add pre-flight checks to verify branch and server health  Phase 3 previously only scanned ports. Now it also instructs the agent to: - Check out the correct branch when testing a PR - Install dependencies after branch switch - Verify the server actually renders content (not just HTTP 200 with a build error)  Learned from a real failure: tested against a dev server running the wrong branch with a broken build, wasting the entire step budget on login attempts before discovering the app wasn't rendering.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>  ---------  Co-authored-by: Claude Opus 4.6 (1M context) <noreply@anthropic.com> Co-authored-by: shubh24 <shubhankar24@gmail.com>") […](https://github.com/browserbase/skills/pull/56) | 4 days agoApr 2, 2026 |
| [.gitignore](https://github.com/browserbase/skills/blob/main/.gitignore ".gitignore") | [.gitignore](https://github.com/browserbase/skills/blob/main/.gitignore ".gitignore") | [refactor: upgrade to stagehand v3 (](https://github.com/browserbase/skills/commit/9620c0f94586e196b7f5de15c0c57b123a8345cd "refactor: upgrade to stagehand v3 (#15)  * feat: upgrade to stagehand v3  * update packages, fix screenshot, modelname, and connecting to the correct cdpUrl") [#15](https://github.com/browserbase/skills/pull/15) [)](https://github.com/browserbase/skills/commit/9620c0f94586e196b7f5de15c0c57b123a8345cd "refactor: upgrade to stagehand v3 (#15)  * feat: upgrade to stagehand v3  * update packages, fix screenshot, modelname, and connecting to the correct cdpUrl") | 3 months agoJan 6, 2026 |
| [README.md](https://github.com/browserbase/skills/blob/main/README.md "README.md") | [README.md](https://github.com/browserbase/skills/blob/main/README.md "README.md") | [Add 5 new skills to README (](https://github.com/browserbase/skills/commit/ddf8833dc400b46df968a614e109273836c376c6 "Add 5 new skills to README (#67)") [#67](https://github.com/browserbase/skills/pull/67) [)](https://github.com/browserbase/skills/commit/ddf8833dc400b46df968a614e109273836c376c6 "Add 5 new skills to README (#67)") | 4 days agoApr 3, 2026 |
| [package.json](https://github.com/browserbase/skills/blob/main/package.json "package.json") | [package.json](https://github.com/browserbase/skills/blob/main/package.json "package.json") | [refactor: deprecate agent-browse, update readme with installation (](https://github.com/browserbase/skills/commit/150ade5bf6ae30772ae92acb1e6e39f8b6181125 "refactor: deprecate agent-browse, update readme with installation (#44)") [#44](https://github.com/browserbase/skills/pull/44) [)](https://github.com/browserbase/skills/commit/150ade5bf6ae30772ae92acb1e6e39f8b6181125 "refactor: deprecate agent-browse, update readme with installation (#44)") | 3 weeks agoMar 16, 2026 |
| [tsconfig.json](https://github.com/browserbase/skills/blob/main/tsconfig.json "tsconfig.json") | [tsconfig.json](https://github.com/browserbase/skills/blob/main/tsconfig.json "tsconfig.json") | [build cli (](https://github.com/browserbase/skills/commit/848e9f92f1cbecdf54cf0159761c691b068b0bc2 "build cli (#9)  * build cli  * increase window size  * link command") [#9](https://github.com/browserbase/skills/pull/9) [)](https://github.com/browserbase/skills/commit/848e9f92f1cbecdf54cf0159761c691b068b0bc2 "build cli (#9)  * build cli  * increase window size  * link command") | 5 months agoNov 4, 2025 |
| View all files |

## Repository files navigation

# Browserbase Skills

[Permalink: Browserbase Skills](https://github.com/browserbase/skills#browserbase-skills)

A set of skills for enabling **[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)** to work with Browserbase through browser automation and the official `bb` CLI.

## Skills

[Permalink: Skills](https://github.com/browserbase/skills#skills)

This plugin includes the following skills (see `skills/` for details):

| Skill | Description |
| --- | --- |
| [browser](https://github.com/browserbase/skills/blob/main/skills/browser/SKILL.md) | Automate web browser interactions via CLI commands — supports remote Browserbase sessions with anti-bot stealth, CAPTCHA solving, and residential proxies |
| [browserbase-cli](https://github.com/browserbase/skills/blob/main/skills/browserbase-cli/SKILL.md) | Use the official `bb` CLI for Browserbase Functions and platform API workflows including sessions, projects, contexts, extensions, fetch, and dashboard |
| [functions](https://github.com/browserbase/skills/blob/main/skills/functions/SKILL.md) | Deploy serverless browser automation to Browserbase cloud using the `bb` CLI |
| [site-debugger](https://github.com/browserbase/skills/blob/main/skills/site-debugger/SKILL.md) | Diagnose and fix failing browser automations — analyzes bot detection, selectors, timing, auth, and captchas, then generates a tested site playbook |
| [bb-usage](https://github.com/browserbase/skills/blob/main/skills/bb-usage/SKILL.md) | Show Browserbase usage stats, session analytics, and cost forecasts in a terminal dashboard |
| [cookie-sync](https://github.com/browserbase/skills/blob/main/skills/cookie-sync/SKILL.md) | Sync cookies from local Chrome to a Browserbase persistent context so the browse CLI can access authenticated sites |
| [fetch](https://github.com/browserbase/skills/blob/main/skills/fetch/SKILL.md) | Fetch HTML or JSON from static pages without a browser session — inspect status codes, headers, follow redirects |
| [search](https://github.com/browserbase/skills/blob/main/skills/search/SKILL.md) | Search the web and return structured results (titles, URLs, metadata) without a browser session |
| [ui-test](https://github.com/browserbase/skills/blob/main/skills/ui-test/SKILL.md) | AI-powered adversarial UI testing — analyzes git diffs to test changes, or explores the full app to find bugs |

## Installation

[Permalink: Installation](https://github.com/browserbase/skills#installation)

To install the skill to popular coding agents:

```
$ npx skills add browserbase/skills
```

### Claude Code

[Permalink: Claude Code](https://github.com/browserbase/skills#claude-code)

On Claude Code, to add the marketplace, simply run:

```
/plugin marketplace add browserbase/skills
```

Then install the plugin:

```
/plugin install browse@browserbase
```

If you prefer the manual interface:

1. On Claude Code, type `/plugin`
2. Select option `3. Add marketplace`
3. Enter the marketplace source: `browserbase/skills`
4. Press enter to select the `browse` plugin
5. Hit enter again to `Install now`
6. **Restart Claude Code** for changes to take effect

## Usage

[Permalink: Usage](https://github.com/browserbase/skills#usage)

Once installed, you can ask Claude to browse or use the Browserbase CLI:

- _"Go to Hacker News, get the top post comments, and summarize them "_
- _"QA test [http://localhost:3000](http://localhost:3000/) and fix any bugs you encounter"_
- _"Order me a pizza, you're already signed in on Doordash"_
- _"Use `bb` to list my Browserbase projects and show the output as JSON"_
- _"Initialize a new Browserbase Function with `bb functions init` and explain the next commands"_

Claude will handle the rest.

For local and localhost work, `browse env local` now starts a clean isolated browser by default. Use `browse env local --auto-connect` when the agent should reuse your existing local Chrome session, cookies, or login state.

## Troubleshooting

[Permalink: Troubleshooting](https://github.com/browserbase/skills#troubleshooting)

### Chrome not found

[Permalink: Chrome not found](https://github.com/browserbase/skills#chrome-not-found)

Install Chrome for your platform:

- **macOS** or **Windows**: [https://www.google.com/chrome/](https://www.google.com/chrome/)
- **Linux**: `sudo apt install google-chrome-stable`

### Profile refresh

[Permalink: Profile refresh](https://github.com/browserbase/skills#profile-refresh)

To refresh cookies from your main Chrome profile:

```
rm -rf .chrome-profile
```

## Resources

[Permalink: Resources](https://github.com/browserbase/skills#resources)

- [Stagehand Documentation](https://github.com/browserbase/stagehand)
- [Claude Code Skills](https://support.claude.com/en/articles/12512176-what-are-skills)

## About

Claude Agent SDK with a web browsing tool


### Resources

[Readme](https://github.com/browserbase/skills#readme-ov-file)

### Uh oh!

There was an error while loading. [Please reload this page](https://github.com/browserbase/skills).

[Activity](https://github.com/browserbase/skills/activity)

[Custom properties](https://github.com/browserbase/skills/custom-properties)

### Stars

[**500**\\
stars](https://github.com/browserbase/skills/stargazers)

### Watchers

[**4**\\
watching](https://github.com/browserbase/skills/watchers)

### Forks

[**40**\\
forks](https://github.com/browserbase/skills/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Fbrowserbase%2Fskills&report=browserbase+%28user%29)

## [Releases](https://github.com/browserbase/skills/releases)

No releases published

## [Packages\  0](https://github.com/orgs/browserbase/packages?repo_name=skills)

No packages published

## [Contributors\  11](https://github.com/browserbase/skills/graphs/contributors)

- [![@shrey150](https://avatars.githubusercontent.com/u/3813908?s=64&v=4)](https://github.com/shrey150)
- [![@miguelg719](https://avatars.githubusercontent.com/u/36487034?s=64&v=4)](https://github.com/miguelg719)
- [![@claude](https://avatars.githubusercontent.com/u/81847?s=64&v=4)](https://github.com/claude)
- [![@pkiv](https://avatars.githubusercontent.com/u/3844752?s=64&v=4)](https://github.com/pkiv)
- [![@Kylejeong2](https://avatars.githubusercontent.com/u/77771518?s=64&v=4)](https://github.com/Kylejeong2)
- [![@cursoragent](https://avatars.githubusercontent.com/u/199161495?s=64&v=4)](https://github.com/cursoragent)
- [![@peytoncasper](https://avatars.githubusercontent.com/u/8305883?s=64&v=4)](https://github.com/peytoncasper)
- [![@shubh24](https://avatars.githubusercontent.com/u/8428235?s=64&v=4)](https://github.com/shubh24)
- [![@quuu](https://avatars.githubusercontent.com/u/32676955?s=64&v=4)](https://github.com/quuu)
- [![@aq17](https://avatars.githubusercontent.com/u/54565933?s=64&v=4)](https://github.com/aq17)
- [![@seanmcguire12](https://avatars.githubusercontent.com/u/75873287?s=64&v=4)](https://github.com/seanmcguire12)

## Languages

- [JavaScript53.4%](https://github.com/browserbase/skills/search?l=javascript)
- [HTML46.6%](https://github.com/browserbase/skills/search?l=html)

You can’t perform that action at this time.