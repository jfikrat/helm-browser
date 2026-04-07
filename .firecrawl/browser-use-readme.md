[Skip to content](https://github.com/browser-use/browser-use#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/browser-use/browser-use) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/browser-use/browser-use) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/browser-use/browser-use) to refresh your session.Dismiss alert

{{ message }}

[browser-use](https://github.com/browser-use)/ **[browser-use](https://github.com/browser-use/browser-use)** Public

- [Notifications](https://github.com/login?return_to=%2Fbrowser-use%2Fbrowser-use) You must be signed in to change notification settings
- [Fork\\
10k](https://github.com/login?return_to=%2Fbrowser-use%2Fbrowser-use)
- [Star\\
86.3k](https://github.com/login?return_to=%2Fbrowser-use%2Fbrowser-use)


main

[**508** Branches](https://github.com/browser-use/browser-use/branches) [**132** Tags](https://github.com/browser-use/browser-use/tags)

[Go to Branches page](https://github.com/browser-use/browser-use/branches)[Go to Tags page](https://github.com/browser-use/browser-use/tags)

Go to file

Code

Open more actions menu

## Folders and files

| Name | Name | Last commit message | Last commit date |
| --- | --- | --- | --- |
| ## Latest commit<br>[![laithrw](https://avatars.githubusercontent.com/u/70768382?v=4&size=40)](https://github.com/laithrw)[laithrw](https://github.com/browser-use/browser-use/commits?author=laithrw)<br>[improve model docs (](https://github.com/browser-use/browser-use/commit/55ca9cb27d3ae65e734207224590d705d2ab4afd) [#4616](https://github.com/browser-use/browser-use/pull/4616) [)](https://github.com/browser-use/browser-use/commit/55ca9cb27d3ae65e734207224590d705d2ab4afd)<br>Open commit detailssuccess<br>yesterdayApr 5, 2026<br>[55ca9cb](https://github.com/browser-use/browser-use/commit/55ca9cb27d3ae65e734207224590d705d2ab4afd) · yesterdayApr 5, 2026<br>## History<br>[9,108 Commits](https://github.com/browser-use/browser-use/commits/main/) <br>Open commit details<br>[View commit history for this file.](https://github.com/browser-use/browser-use/commits/main/) 9,108 Commits |
| [.github](https://github.com/browser-use/browser-use/tree/main/.github ".github") | [.github](https://github.com/browser-use/browser-use/tree/main/.github ".github") | [drop unnecessary contents:read from cloud\_evals workflow](https://github.com/browser-use/browser-use/commit/3cd7841052c3c1857aaf99cc728c1bacc37c860e "drop unnecessary contents:read from cloud_evals workflow") | 2 weeks agoMar 22, 2026 |
| [bin](https://github.com/browser-use/browser-use/tree/main/bin "bin") | [bin](https://github.com/browser-use/browser-use/tree/main/bin "bin") | [refactor: improve type checking and linting script](https://github.com/browser-use/browser-use/commit/c99e1bb41fa6e0738a9b64facdb68f68368fa8dd "refactor: improve type checking and linting script  - Updated `pyproject.toml` to enhance type checking configuration by refining the `exclude` list and adding an `include` section for better clarity. - Modified `lint.sh` to run tools directly from the virtual environment, improving execution reliability and avoiding permission errors. - Enhanced comments in `lint.sh` for better understanding of script functionality and usage.") | 5 months agoNov 11, 2025 |
| [browser\_use](https://github.com/browser-use/browser-use/tree/main/browser_use "browser_use") | [browser\_use](https://github.com/browser-use/browser-use/tree/main/browser_use "browser_use") | [fix: create token temp file with 0o600 at open() time; raise on failure](https://github.com/browser-use/browser-use/commit/ca2185ba61d5013f23ad9024e36171994b7c0946 "fix: create token temp file with 0o600 at open() time; raise on failure  - Use os.open() with mode 0o600 instead of write-then-chmod to eliminate   the permission race window where the temp file is briefly world-readable. - Raise instead of warn when token file write fails: a daemon that cannot   persist its auth token is permanently unauthorized for all clients, so   failing fast is correct (identified by cubic).") | 4 days agoApr 2, 2026 |
| [docker](https://github.com/browser-use/browser-use/tree/main/docker "docker") | [docker](https://github.com/browser-use/browser-use/tree/main/docker "docker") | [fix: correct docker build context path in build-base-images.sh](https://github.com/browser-use/browser-use/commit/51dbeff043f08f291e5f296a5b0d4d3a3fb02f49 "fix: correct docker build context path in build-base-images.sh  Build context was set to ../../.. but the script cd's into docker/ on line 31, so only .. is needed to reach the repo root. This caused the build to fail when running from the repo root.  Fixes #4011  fix: add missing newline at end of file  fix: remove accidental heredoc wrapper from build script") | 2 months agoFeb 3, 2026 |
| [examples](https://github.com/browser-use/browser-use/tree/main/examples "examples") | [examples](https://github.com/browser-use/browser-use/tree/main/examples "examples") | [rm code agent](https://github.com/browser-use/browser-use/commit/43b5e4ce1d813db6641c82783a40f7b91fe9dde2 "rm code agent") | 2 weeks agoMar 21, 2026 |
| [skills](https://github.com/browser-use/browser-use/tree/main/skills "skills") | [skills](https://github.com/browser-use/browser-use/tree/main/skills "skills") | [improve model docs](https://github.com/browser-use/browser-use/commit/c1151715d35810aa7149f2b66af035e3be76c540 "improve model docs") | yesterdayApr 5, 2026 |
| [static](https://github.com/browser-use/browser-use/tree/main/static "static") | [static](https://github.com/browser-use/browser-use/tree/main/static "static") | [update benchmark plot with bu-ultra result (78%)](https://github.com/browser-use/browser-use/commit/671ca0571c6a5cd8eba929f517683b26f53e50c5 "update benchmark plot with bu-ultra result (78%)") | 2 weeks agoMar 24, 2026 |
| [tests](https://github.com/browser-use/browser-use/tree/main/tests "tests") | [tests](https://github.com/browser-use/browser-use/tree/main/tests "tests") | [style: flatten assert to pass pre-commit formatter](https://github.com/browser-use/browser-use/commit/454dbfdaba17cfffb5b9dcfc96ca17b1b4c9c258 "style: flatten assert to pass pre-commit formatter") | 4 days agoApr 2, 2026 |
| [.dockerignore](https://github.com/browser-use/browser-use/blob/main/.dockerignore ".dockerignore") | [.dockerignore](https://github.com/browser-use/browser-use/blob/main/.dockerignore ".dockerignore") | [ignore .bak files in docker and git](https://github.com/browser-use/browser-use/commit/6a7bbb12c9ee983caabd681794d1bf54696852bc "ignore .bak files in docker and git") | 10 months agoJun 26, 2025 |
| [.env.example](https://github.com/browser-use/browser-use/blob/main/.env.example ".env.example") | [.env.example](https://github.com/browser-use/browser-use/blob/main/.env.example ".env.example") | [env var to disable version check](https://github.com/browser-use/browser-use/commit/f98eb7a83848b7b4133559b52fce46894638cfd6 "env var to disable version check") | 5 months agoNov 26, 2025 |
| [.gitattributes](https://github.com/browser-use/browser-use/blob/main/.gitattributes ".gitattributes") | [.gitattributes](https://github.com/browser-use/browser-use/blob/main/.gitattributes ".gitattributes") | [Remove mp4 files and update gitattributes](https://github.com/browser-use/browser-use/commit/2a9170cb8106d310722a89aadfcf3da970de450e "Remove mp4 files and update gitattributes") | 2 years agoNov 18, 2024 |
| [.gitignore](https://github.com/browser-use/browser-use/blob/main/.gitignore ".gitignore") | [.gitignore](https://github.com/browser-use/browser-use/blob/main/.gitignore ".gitignore") | [docs: Add cleanup instructions to SKILL.md](https://github.com/browser-use/browser-use/commit/df018867912da62670f258a8f630979cb42297a7 "docs: Add cleanup instructions to SKILL.md") | 3 months agoJan 22, 2026 |
| [.pre-commit-config.yaml](https://github.com/browser-use/browser-use/blob/main/.pre-commit-config.yaml ".pre-commit-config.yaml") | [.pre-commit-config.yaml](https://github.com/browser-use/browser-use/blob/main/.pre-commit-config.yaml ".pre-commit-config.yaml") | [fixed styling issues](https://github.com/browser-use/browser-use/commit/e50588f3c713d2d7497fb71589f0d059f0b07e0c "fixed styling issues") | 2 months agoFeb 23, 2026 |
| [.python-version](https://github.com/browser-use/browser-use/blob/main/.python-version ".python-version") | [.python-version](https://github.com/browser-use/browser-use/blob/main/.python-version ".python-version") | [bump dependency versions](https://github.com/browser-use/browser-use/commit/a33bd7eea57582a539ac2e1c6fa440ecbb9d6eaa "bump dependency versions") | 11 months agoJun 3, 2025 |
| [AGENTS.md](https://github.com/browser-use/browser-use/blob/main/AGENTS.md "AGENTS.md") | [AGENTS.md](https://github.com/browser-use/browser-use/blob/main/AGENTS.md "AGENTS.md") | [Remove $10 free credit mentions from documentation](https://github.com/browser-use/browser-use/commit/26ed331cbbca49d8c333e6fad5eb2e0d65e02b35 "Remove $10 free credit mentions from documentation  Removes references to $10 signup credits from README.md and AGENTS.md as this promotion is being discontinued.  https://claude.ai/code/session_01CTCYfXrPi3SxEZeBy9DevS") | last monthMar 10, 2026 |
| [CLAUDE.md](https://github.com/browser-use/browser-use/blob/main/CLAUDE.md "CLAUDE.md") | [CLAUDE.md](https://github.com/browser-use/browser-use/blob/main/CLAUDE.md "CLAUDE.md") | [improve extract data](https://github.com/browser-use/browser-use/commit/97d022d5a848881d7e6b6ab9d63d816980ab11b8 "improve extract data") | 8 months agoAug 31, 2025 |
| [CLOUD.md](https://github.com/browser-use/browser-use/blob/main/CLOUD.md "CLOUD.md") | [CLOUD.md](https://github.com/browser-use/browser-use/blob/main/CLOUD.md "CLOUD.md") | [docs: update CLOUD.md to reflect 5 free tasks offer](https://github.com/browser-use/browser-use/commit/3ef14faf488a2bb515f23e4436230a98ce783b7f "docs: update CLOUD.md to reflect 5 free tasks offer  The free tier changed from signup credits to 5 free tasks. Updates the outdated \"free starter credits\" reference in CLOUD.md.  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>") | 3 weeks agoMar 19, 2026 |
| [Dockerfile](https://github.com/browser-use/browser-use/blob/main/Dockerfile "Dockerfile") | [Dockerfile](https://github.com/browser-use/browser-use/blob/main/Dockerfile "Dockerfile") | [Refactor Dockerfile and update tests for improved functionality](https://github.com/browser-use/browser-use/commit/72bb0de17a57ecaec23e4116558937f685ff363d "Refactor Dockerfile and update tests for improved functionality  - Changed Chromium installation method in Dockerfile to use system packages directly, enhancing reliability and reducing complexity. - Updated test_registry_action_search_google.py to fix an issue with retrieving the initial URL from the browser state. - Streamlined test_sync_agent_events.py by removing outdated test cases and improving clarity in event validation.") | 8 months agoAug 27, 2025 |
| [Dockerfile.fast](https://github.com/browser-use/browser-use/blob/main/Dockerfile.fast "Dockerfile.fast") | [Dockerfile.fast](https://github.com/browser-use/browser-use/blob/main/Dockerfile.fast "Dockerfile.fast") | [speedup docker build to 20s](https://github.com/browser-use/browser-use/commit/0b8fda5d7c898c28ffc830788e48640e3e58e6cf "speedup docker build to 20s") | 10 months agoJun 27, 2025 |
| [LICENSE](https://github.com/browser-use/browser-use/blob/main/LICENSE "LICENSE") | [LICENSE](https://github.com/browser-use/browser-use/blob/main/LICENSE "LICENSE") | [Added MIT license](https://github.com/browser-use/browser-use/commit/8f145fb2bb45dc60d9e218e651bd1a59cbc5b549 "Added MIT license") | 2 years agoNov 5, 2024 |
| [README.md](https://github.com/browser-use/browser-use/blob/main/README.md "README.md") | [README.md](https://github.com/browser-use/browser-use/blob/main/README.md "README.md") | [improve readme plot styling](https://github.com/browser-use/browser-use/commit/9919f2eee6b59572ece340ac224cbfa24350a713 "improve readme plot styling") | 2 weeks agoMar 22, 2026 |
| [pyproject.toml](https://github.com/browser-use/browser-use/blob/main/pyproject.toml "pyproject.toml") | [pyproject.toml](https://github.com/browser-use/browser-use/blob/main/pyproject.toml "pyproject.toml") | [fix: upgrade requests to 2.33.0 to patch temp-file path-traversal vul…](https://github.com/browser-use/browser-use/commit/59ef9adeb6d5cdc1ff03dc945f20286ccd87c112 "fix: upgrade requests to 2.33.0 to patch temp-file path-traversal vulnerability  Bumps requests from 2.32.5 to 2.33.0. extract_zipped_paths() previously wrote to a predictable temp path with no validation, allowing a local attacker to pre-create a malicious file that would be loaded in its place. 2.33.0 extracts to a non-deterministic location, eliminating the race condition.") | 4 days agoApr 2, 2026 |
| View all files |

## Repository files navigation

![Shows a black Browser Use Logo in light color mode and a white one in dark color mode.](https://github.com/user-attachments/assets/2ccdb752-22fb-41c7-8948-857fc1ad7e24)

![The AI browser agent.](https://github.com/user-attachments/assets/9955dda9-ede3-4971-8ee0-91cbc3850125)

[![Browser-Use Package Download Statistics](https://camo.githubusercontent.com/f67549cea6229347ae19319784e0bbd39a6f987cab1d48cd464017f02e955a04/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f7061636b616765)](https://cloud.browser-use.com/)

* * *

[![Demos](https://camo.githubusercontent.com/7e9025c343a4acd95c54d84d83b23f875323ee3f58cb4ec2c764f4c07c7835e7/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f64656d6f73)](https://github.com/browser-use/browser-use#demos)[![Docs](https://camo.githubusercontent.com/da24e49e145642fb3a3fe1910e856d59d6da1491afd35998b8624f6732262f49/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f646f6373)](https://docs.browser-use.com/)[![Blog](https://camo.githubusercontent.com/f59d6529dd474485d76d72dfa57622e93de03c2f2147d15645f237057d6ac1e2/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f626c6f67)](https://browser-use.com/posts)[![Merch](https://camo.githubusercontent.com/6854add877f53678eb94c1903d14b88427b87dfcbc7b46fa04d9023826b4c2c2/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f6d65726368)](https://browsermerch.com/)[![Github Stars](https://camo.githubusercontent.com/6b321c4c3a0fe9ebd185f7e1ed0c34908ed763b0670359685038826220fa0c73/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f676974687562)](https://github.com/browser-use/browser-use)[![Twitter](https://camo.githubusercontent.com/0c0d368a2b84e6c55dfa4b61dfcc6b20fc79911ddac2890188b6f5aa4d9e1ff9/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f74776974746572)](https://x.com/intent/user?screen_name=browser_use)[![Discord](https://camo.githubusercontent.com/4924db0665fc88bd7ed197fa3535511406743b1025c5086a32e252a613ad1176/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f646973636f7264)](https://link.browser-use.com/discord)[![Browser-Use Cloud](https://camo.githubusercontent.com/af449ec43f198f27fd42b59996473270e5dd2eeb482196bfca572ee48a2afbcc/68747470733a2f2f6d656469612e62726f777365722d7573652e746f6f6c732f6261646765732f636c6f7564)](https://cloud.browser-use.com/)

🌤️ Want to skip the setup? Use our **[cloud](https://cloud.browser-use.com/)** for faster, scalable, stealth-enabled browser automation!

# 🤖 LLM Quickstart

[Permalink: 🤖 LLM Quickstart](https://github.com/browser-use/browser-use#-llm-quickstart)

1. Direct your favorite coding agent (Cursor, Claude Code, etc) to [Agents.md](https://docs.browser-use.com/llms-full.txt)
2. Prompt away!

# 👋 Human Quickstart

[Permalink: 👋 Human Quickstart](https://github.com/browser-use/browser-use#-human-quickstart)

**1\. Create environment and install Browser-Use with [uv](https://docs.astral.sh/uv/) (Python>=3.11):**

```
uv init && uv add browser-use && uv sync
# uvx browser-use install  # Run if you don't have Chromium installed
```

**2\. \[Optional\] Get your API key from [Browser Use Cloud](https://cloud.browser-use.com/new-api-key):**

```
# .env
BROWSER_USE_API_KEY=your-key
# GOOGLE_API_KEY=your-key
# ANTHROPIC_API_KEY=your-key
```

**3\. Run your first agent:**

```
from browser_use import Agent, Browser, ChatBrowserUse
# from browser_use import ChatGoogle  # ChatGoogle(model='gemini-3-flash-preview')
# from browser_use import ChatAnthropic  # ChatAnthropic(model='claude-sonnet-4-6')
import asyncio

async def main():
    browser = Browser(
        # use_cloud=True,  # Use a stealth browser on Browser Use Cloud
    )

    agent = Agent(
        task="Find the number of stars of the browser-use repo",
        llm=ChatBrowserUse(),
        # llm=ChatGoogle(model='gemini-3-flash-preview'),
        # llm=ChatAnthropic(model='claude-sonnet-4-6'),
        browser=browser,
    )
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
```

Check out the [library docs](https://docs.browser-use.com/open-source/introduction) and the [cloud docs](https://docs.cloud.browser-use.com/) for more!

# Open Source vs Cloud

[Permalink: Open Source vs Cloud](https://github.com/browser-use/browser-use#open-source-vs-cloud)

![BU Bench V1 - LLM Success Rates](https://github.com/browser-use/browser-use/raw/main/static/accuracy_by_model_light.png)

We benchmark Browser Use across 100 real-world browser tasks. Full benchmark is open source: **[browser-use/benchmark](https://github.com/browser-use/benchmark)**.

**Use Open Source**

- You need [custom tools](https://docs.browser-use.com/customize/tools/basics) or deep code-level integration
- You want to self-host and deploy browser agents on your own machines

**Use [Cloud](https://cloud.browser-use.com/) (recommended)**

- Much better agent for complex tasks (see plot above)
- Easiest way to start and scale
- Best stealth with proxy rotation and captcha solving
- 1000+ integrations (Gmail, Slack, Notion, and more)
- Persistent filesystem and memory

**Use Both**

- Use the open-source library with your [custom tools](https://docs.browser-use.com/customize/tools/basics) while running our [cloud browsers](https://docs.browser-use.com/open-source/customize/browser/remote) and [ChatBrowserUse model](https://docs.browser-use.com/open-source/supported-models)

# Demos

[Permalink: Demos](https://github.com/browser-use/browser-use#demos)

### 📋 Form-Filling

[Permalink: 📋 Form-Filling](https://github.com/browser-use/browser-use#-form-filling)

#### Task = "Fill in this job application with my resume and information."

[Permalink: Task = "Fill in this job application with my resume and information."](https://github.com/browser-use/browser-use#task--fill-in-this-job-application-with-my-resume-and-information)

![Job Application Demo](https://private-user-images.githubusercontent.com/43824272/501209081-57865ee6-6004-49d5-b2c2-6dff39ec2ba9.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU1MjQ0NzcsIm5iZiI6MTc3NTUyNDE3NywicGF0aCI6Ii80MzgyNDI3Mi81MDEyMDkwODEtNTc4NjVlZTYtNjAwNC00OWQ1LWIyYzItNmRmZjM5ZWMyYmE5LmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA0MDclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNDA3VDAxMDkzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWYwZWMxODBhMWYyOTgyMDgxNjcyMmVmMWRkOWZjN2I0ZTk1ZmQ1NmM4ZjNlYWE2ZWRiMTk5NTEwZTUxYTlmZDImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.z1Cc9c2qX5URfITtDW0SKK_n5SiKBYnje3PVIX_S3ck)![Job Application Demo](https://private-user-images.githubusercontent.com/43824272/501209081-57865ee6-6004-49d5-b2c2-6dff39ec2ba9.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU1MjQ0NzcsIm5iZiI6MTc3NTUyNDE3NywicGF0aCI6Ii80MzgyNDI3Mi81MDEyMDkwODEtNTc4NjVlZTYtNjAwNC00OWQ1LWIyYzItNmRmZjM5ZWMyYmE5LmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA0MDclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNDA3VDAxMDkzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWYwZWMxODBhMWYyOTgyMDgxNjcyMmVmMWRkOWZjN2I0ZTk1ZmQ1NmM4ZjNlYWE2ZWRiMTk5NTEwZTUxYTlmZDImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.z1Cc9c2qX5URfITtDW0SKK_n5SiKBYnje3PVIX_S3ck)[Open Job Application Demo in new window](https://private-user-images.githubusercontent.com/43824272/501209081-57865ee6-6004-49d5-b2c2-6dff39ec2ba9.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU1MjQ0NzcsIm5iZiI6MTc3NTUyNDE3NywicGF0aCI6Ii80MzgyNDI3Mi81MDEyMDkwODEtNTc4NjVlZTYtNjAwNC00OWQ1LWIyYzItNmRmZjM5ZWMyYmE5LmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA0MDclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNDA3VDAxMDkzN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWYwZWMxODBhMWYyOTgyMDgxNjcyMmVmMWRkOWZjN2I0ZTk1ZmQ1NmM4ZjNlYWE2ZWRiMTk5NTEwZTUxYTlmZDImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.z1Cc9c2qX5URfITtDW0SKK_n5SiKBYnje3PVIX_S3ck)[Example code ↗](https://github.com/browser-use/browser-use/blob/main/examples/use-cases/apply_to_job.py)

### 🍎 Grocery-Shopping

[Permalink: 🍎 Grocery-Shopping](https://github.com/browser-use/browser-use#-grocery-shopping)

#### Task = "Put this list of items into my instacart."

[Permalink: Task = "Put this list of items into my instacart."](https://github.com/browser-use/browser-use#task--put-this-list-of-items-into-my-instacart)

grocery-use-large.mp4

[Example code ↗](https://github.com/browser-use/browser-use/blob/main/examples/use-cases/buy_groceries.py)

### 💻 Personal-Assistant.

[Permalink: 💻 Personal-Assistant.](https://github.com/browser-use/browser-use#-personal-assistant)

#### Task = "Help me find parts for a custom PC."

[Permalink: Task = "Help me find parts for a custom PC."](https://github.com/browser-use/browser-use#task--help-me-find-parts-for-a-custom-pc)

pc-use-large.mp4

[Example code ↗](https://github.com/browser-use/browser-use/blob/main/examples/use-cases/pcpartpicker.py)

### 💡See [more examples here ↗](https://docs.browser-use.com/examples) and give us a star!

[Permalink: 💡See more examples here ↗ and give us a star!](https://github.com/browser-use/browser-use#see-more-examples-here--and-give-us-a-star)

# 🚀 Template Quickstart

[Permalink: 🚀 Template Quickstart](https://github.com/browser-use/browser-use#-template-quickstart)

**Want to get started even faster?** Generate a ready-to-run template:

```
uvx browser-use init --template default
```

This creates a `browser_use_default.py` file with a working example. Available templates:

- `default` \- Minimal setup to get started quickly
- `advanced` \- All configuration options with detailed comments
- `tools` \- Examples of custom tools and extending the agent

You can also specify a custom output path:

```
uvx browser-use init --template default --output my_agent.py
```

# 💻 CLI

[Permalink: 💻 CLI](https://github.com/browser-use/browser-use#-cli)

Fast, persistent browser automation from the command line:

```
browser-use open https://example.com    # Navigate to URL
browser-use state                       # See clickable elements
browser-use click 5                     # Click element by index
browser-use type "Hello"                # Type text
browser-use screenshot page.png         # Take screenshot
browser-use close                       # Close browser
```

The CLI keeps the browser running between commands for fast iteration. See [CLI docs](https://github.com/browser-use/browser-use/blob/main/browser_use/skill_cli/README.md) for all commands.

### Claude Code Skill

[Permalink: Claude Code Skill](https://github.com/browser-use/browser-use#claude-code-skill)

For [Claude Code](https://claude.ai/code), install the skill to enable AI-assisted browser automation:

```
mkdir -p ~/.claude/skills/browser-use
curl -o ~/.claude/skills/browser-use/SKILL.md \
  https://raw.githubusercontent.com/browser-use/browser-use/main/skills/browser-use/SKILL.md
```

## Integrations, hosting, custom tools, MCP, and more on our [Docs ↗](https://docs.browser-use.com/)

[Permalink: Integrations, hosting, custom tools, MCP, and more on our Docs ↗](https://github.com/browser-use/browser-use#integrations-hosting-custom-tools-mcp-and-more-on-our-docs-)

# FAQ

[Permalink: FAQ](https://github.com/browser-use/browser-use#faq)

**What's the best model to use?**

We optimized **ChatBrowserUse()** specifically for browser automation tasks. On avg it completes tasks 3-5x faster than other models with SOTA accuracy.

**Pricing (per 1M tokens):**

- Input tokens: $0.20
- Cached input tokens: $0.02
- Output tokens: $2.00

For other LLM providers, see our [supported models documentation](https://docs.browser-use.com/supported-models).

**Should I use the Browser Use system prompt with the open-source preview model?**

Yes. If you use `ChatBrowserUse(model='browser-use/bu-30b-a3b-preview')` with a normal `Agent(...)`, Browser Use still sends its default agent system prompt for you.

You do **not** need to add a separate custom "Browser Use system message" just because you switched to the open-source preview model. Only use `extend_system_message` or `override_system_message` when you intentionally want to customize the default behavior for your task.

If you want the best default speed/accuracy, we still recommend the newer hosted `bu-*` models. If you want the open-source preview model, the setup stays the same apart from the `model=` value.

**Can I use custom tools with the agent?**

Yes! You can add custom tools to extend the agent's capabilities:

```
from browser_use import Tools

tools = Tools()

@tools.action(description='Description of what this tool does.')
def custom_tool(param: str) -> str:
    return f"Result: {param}"

agent = Agent(
    task="Your task",
    llm=llm,
    browser=browser,
    tools=tools,
)
```

**Can I use this for free?**

Yes! Browser-Use is open source and free to use. You only need to choose an LLM provider (like OpenAI, Google, ChatBrowserUse, or run local models with Ollama).

**Terms of Service**

This open-source library is licensed under the MIT License. For Browser Use services & data policy, see our [Terms of Service](https://browser-use.com/legal/terms-of-service) and [Privacy Policy](https://browser-use.com/privacy/).

**How do I handle authentication?**

Check out our authentication examples:

- [Using real browser profiles](https://github.com/browser-use/browser-use/blob/main/examples/browser/real_browser.py) \- Reuse your existing Chrome profile with saved logins
- If you want to use temporary accounts with inbox, choose AgentMail
- To sync your auth profile with the remote browser, run `curl -fsSL https://browser-use.com/profile.sh | BROWSER_USE_API_KEY=XXXX sh` (replace XXXX with your API key)

These examples show how to maintain sessions and handle authentication seamlessly.

**How do I solve CAPTCHAs?**

For CAPTCHA handling, you need better browser fingerprinting and proxies. Use [Browser Use Cloud](https://cloud.browser-use.com/) which provides stealth browsers designed to avoid detection and CAPTCHA challenges.

**How do I go into production?**

Chrome can consume a lot of memory, and running many agents in parallel can be tricky to manage.

For production use cases, use our [Browser Use Cloud API](https://cloud.browser-use.com/) which handles:

- Scalable browser infrastructure
- Memory management
- Proxy rotation
- Stealth browser fingerprinting
- High-performance parallel execution

**Tell your computer what to do, and it gets it done.**

![](https://private-user-images.githubusercontent.com/67061560/425692580-06fa3078-8461-4560-b434-445510c1766f.jpeg?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzU1MjQ0NzcsIm5iZiI6MTc3NTUyNDE3NywicGF0aCI6Ii82NzA2MTU2MC80MjU2OTI1ODAtMDZmYTMwNzgtODQ2MS00NTYwLWI0MzQtNDQ1NTEwYzE3NjZmLmpwZWc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNDA3JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDQwN1QwMTA5MzdaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hMjk4ZTY2MWExZGU0MzkwOTIwMjEwYjk3NjkxYWM0ZWFmMTk2ZWM0YjUwMDZjOTFmNTdlODM1YjI0MjhlOTliJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.HQlqrlIudjg-yf8pU_LgLNsNLJjMV5KAqg0igOMd6vE)

[![Twitter Follow](https://camo.githubusercontent.com/258b250cd1a66c0f3e47cb6280a83ab23ed0d8039bfd7b3b26a428a2550682cc/68747470733a2f2f696d672e736869656c64732e696f2f747769747465722f666f6c6c6f772f4d61676e75733f7374796c653d736f6369616c)](https://x.com/intent/user?screen_name=mamagnus00)[![Twitter Follow](https://camo.githubusercontent.com/a0e8b2ed77d58af1a210d43db92aed35ed54cf7bb37564586e1fd647dcafb3dc/68747470733a2f2f696d672e736869656c64732e696f2f747769747465722f666f6c6c6f772f477265676f723f7374796c653d736f6369616c)](https://x.com/intent/user?screen_name=gregpr07)

Made with ❤️ in Zurich and San Francisco

## About

🌐 Make websites accessible for AI agents. Automate tasks online with ease.


[browser-use.com](https://browser-use.com/ "https://browser-use.com")

### Topics

[python](https://github.com/topics/python "Topic: python") [browser-automation](https://github.com/topics/browser-automation "Topic: browser-automation") [ai-agents](https://github.com/topics/ai-agents "Topic: ai-agents") [playwright](https://github.com/topics/playwright "Topic: playwright") [ai-tools](https://github.com/topics/ai-tools "Topic: ai-tools") [llm](https://github.com/topics/llm "Topic: llm") [browser-use](https://github.com/topics/browser-use "Topic: browser-use")

### Resources

[Readme](https://github.com/browser-use/browser-use#readme-ov-file)

### License

[MIT license](https://github.com/browser-use/browser-use#MIT-1-ov-file)

### Contributing

[Contributing](https://github.com/browser-use/browser-use#contributing-ov-file)

### Security policy

[Security policy](https://github.com/browser-use/browser-use#security-ov-file)

### Uh oh!

There was an error while loading. [Please reload this page](https://github.com/browser-use/browser-use).

[Activity](https://github.com/browser-use/browser-use/activity)

[Custom properties](https://github.com/browser-use/browser-use/custom-properties)

### Stars

[**86.3k**\\
stars](https://github.com/browser-use/browser-use/stargazers)

### Watchers

[**417**\\
watching](https://github.com/browser-use/browser-use/watchers)

### Forks

[**10k**\\
forks](https://github.com/browser-use/browser-use/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Fbrowser-use%2Fbrowser-use&report=browser-use+%28user%29)

## [Releases\  123](https://github.com/browser-use/browser-use/releases)

[0.12.6\\
Latest\\
\\
5 days agoApr 2, 2026](https://github.com/browser-use/browser-use/releases/tag/0.12.6)

[\+ 122 releases](https://github.com/browser-use/browser-use/releases)

## [Packages\  0](https://github.com/orgs/browser-use/packages?repo_name=browser-use)

No packages published

## [Used by 2.4k](https://github.com/browser-use/browser-use/network/dependents)

[- ![@doois](https://avatars.githubusercontent.com/u/80427558?s=64&v=4)\\
- ![@isimple-user](https://avatars.githubusercontent.com/u/269018284?s=64&v=4)\\
- ![@infrareactive](https://avatars.githubusercontent.com/u/247544576?s=64&v=4)\\
- ![@infrareactive](https://avatars.githubusercontent.com/u/247544576?s=64&v=4)\\
- ![@infrareactive](https://avatars.githubusercontent.com/u/247544576?s=64&v=4)\\
- ![@x0VIER](https://avatars.githubusercontent.com/u/112355900?s=64&v=4)\\
- ![@Azure](https://avatars.githubusercontent.com/u/6844498?s=64&v=4)\\
- ![@nikoz84](https://avatars.githubusercontent.com/u/6708508?s=64&v=4)\\
\\
\+ 2,398](https://github.com/browser-use/browser-use/network/dependents)

## [Contributors\  308](https://github.com/browser-use/browser-use/graphs/contributors)

- [![@MagMueller](https://avatars.githubusercontent.com/u/67061560?s=64&v=4)](https://github.com/MagMueller)
- [![@pirate](https://avatars.githubusercontent.com/u/511499?s=64&v=4)](https://github.com/pirate)
- [![@mertunsall](https://avatars.githubusercontent.com/u/22038471?s=64&v=4)](https://github.com/mertunsall)
- [![@sauravpanda](https://avatars.githubusercontent.com/u/12201824?s=64&v=4)](https://github.com/sauravpanda)
- [![@gregpr07](https://avatars.githubusercontent.com/u/36313686?s=64&v=4)](https://github.com/gregpr07)
- [![@ShawnPana](https://avatars.githubusercontent.com/u/129362299?s=64&v=4)](https://github.com/ShawnPana)
- [![@laithrw](https://avatars.githubusercontent.com/u/70768382?s=64&v=4)](https://github.com/laithrw)
- [![@Alezander9](https://avatars.githubusercontent.com/u/43824272?s=64&v=4)](https://github.com/Alezander9)
- [![@reformedot](https://avatars.githubusercontent.com/u/44302869?s=64&v=4)](https://github.com/reformedot)
- [![@kalil0321](https://avatars.githubusercontent.com/u/92564081?s=64&v=4)](https://github.com/kalil0321)
- [![@cursoragent](https://avatars.githubusercontent.com/u/199161495?s=64&v=4)](https://github.com/cursoragent)
- [![@claude](https://avatars.githubusercontent.com/u/81847?s=64&v=4)](https://github.com/claude)
- [![@cubic-dev-ai[bot]](https://avatars.githubusercontent.com/in/1082092?s=64&v=4)](https://github.com/apps/cubic-dev-ai)
- [![@avocardio](https://avatars.githubusercontent.com/u/74978236?s=64&v=4)](https://github.com/avocardio)

[\+ 294 contributors](https://github.com/browser-use/browser-use/graphs/contributors)

## Languages

- [Python97.9%](https://github.com/browser-use/browser-use/search?l=python)
- [Shell1.4%](https://github.com/browser-use/browser-use/search?l=shell)
- Other0.7%

You can’t perform that action at this time.