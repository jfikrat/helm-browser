[Skip to main content](https://docs.browserbase.com/welcome/getting-started#content-area)

[Browserbase Documentation home page![light logo](https://mintcdn.com/browserbase/SoYEm-IyDzD4GuwP/logo/light.svg?fit=max&auto=format&n=SoYEm-IyDzD4GuwP&q=85&s=67d2dac0a6cdd091f364c6763a3393cd)![dark logo](https://mintcdn.com/browserbase/SoYEm-IyDzD4GuwP/logo/dark.svg?fit=max&auto=format&n=SoYEm-IyDzD4GuwP&q=85&s=a5e13fbe06c29ec92c87ddef9a46b1c8)](https://www.browserbase.com/)

Search...

Ctrl KAsk AI

Search...

Navigation

Welcome

Overview

[Docs](https://docs.browserbase.com/welcome/introduction) [Integrations](https://docs.browserbase.com/integrations/get-started) [APIs & SDKs](https://docs.browserbase.com/reference/introduction) [Templates ↗](https://www.browserbase.com/templates) [Stagehand ↗](https://docs.stagehand.dev/) [Changelog ↗](https://www.browserbase.com/changelog) [Dashboard ↗](https://www.browserbase.com/overview)

[Docs](https://docs.browserbase.com/welcome/introduction) [Integrations](https://docs.browserbase.com/integrations/get-started) [APIs & SDKs](https://docs.browserbase.com/reference/introduction) [Templates ↗](https://www.browserbase.com/templates) [Stagehand ↗](https://docs.stagehand.dev/) [Changelog ↗](https://www.browserbase.com/changelog) [Dashboard ↗](https://www.browserbase.com/overview)

Run your first browser session and learn the Browserbase basics.

**Using Claude Code, Cursor, or another coding agent?** Paste this into your prompt to browse the web, debug sessions, and manage your entire project via the Browserbase CLI:

```
Read https://browserbase.com/SKILL.md to set up Browserbase
```

## [​](https://docs.browserbase.com/welcome/getting-started\#creating-your-account)  Creating your account

[Sign up for a Browserbase account](https://www.browserbase.com/sign-up). The free plan includes:

- One browser session running at a time
- 60 minutes of browser time per month

Having trouble with phone verification? Reach out via the [support portal](https://portal.usepylon.com/browserbase/forms/talk-to-an-engineer) or email [support@browserbase.com](mailto:support@browserbase.com).

## [​](https://docs.browserbase.com/welcome/getting-started\#overview-dashboard)  Overview dashboard

The overview dashboard is the first page you’ll see when you log in to Browserbase and click into a project. It gives you a quick snapshot of your browser sessions, usage, and status.

![](https://mintcdn.com/browserbase/giE_cpy18f2mWHqr/images/getting-started/overview.png?fit=max&auto=format&n=giE_cpy18f2mWHqr&q=85&s=3d6f582d4ba89bb942c94f6fcb53e6be)

On the [overview page](https://www.browserbase.com/overview), you’ll find:

- **Your project ID and API key** on the right side
- Currently running and recently completed sessions
- Historical usage statistics, performance metrics, and system status

## [​](https://docs.browserbase.com/welcome/getting-started\#using-the-playground)  Using the playground

The [Playground](https://www.browserbase.com/playground) lets you try Browserbase directly in your browser — no local setup needed.

1. Navigate to the [Playground](https://www.browserbase.com/playground)
2. Command + Click on one of the templates in the code editor
3. Click “Run” to start a browser session and execute the code
4. Watch the session via [Live View](https://docs.browserbase.com/platform/browser/observability/session-live-view) on the right
5. Click “Stop” to shut down the browser

After completing a session in the Playground, click the “View Session” button to open the Session Inspector.

## [​](https://docs.browserbase.com/welcome/getting-started\#session-inspector)  Session Inspector

Use the [Session Inspector](https://docs.browserbase.com/platform/browser/observability/observability) to watch sessions in real time, view recordings, or inspect logs.

## [​](https://docs.browserbase.com/welcome/getting-started\#sessions-list)  Sessions list

Find all your sessions in the [Sessions](https://www.browserbase.com/sessions) tab. From there, you can open the Session Inspector for any session.

![](https://mintcdn.com/browserbase/giE_cpy18f2mWHqr/images/getting-started/sessions.png?fit=max&auto=format&n=giE_cpy18f2mWHqr&q=85&s=4eace23aa5e33fa2993c7cb48a14864f)

If you know your session ID, you can also access the Session Inspector by navigating to `https://www.browserbase.com/sessions/[session-id]`.

## [​](https://docs.browserbase.com/welcome/getting-started\#next-steps)  Next steps

Once you’ve run a session in the playground, you’ll likely want to integrate Browserbase into your own codebase. You have two main approaches:

1. **Direct session control** — Create browser sessions and control them with your preferred automation framework
2. **Cloud Functions** — Deploy browser agents as cloud functions invocable via API

### [​](https://docs.browserbase.com/welcome/getting-started\#using-browser-sessions)  Using browser sessions

Pick a browser automation framework and follow the framework-specific quickstart to get a Browserbase project running locally. Browserbase supports all popular frameworks and many [integrations](https://docs.browserbase.com/integrations).

If you’re not sure which framework to use,
[Stagehand](https://docs.browserbase.com/welcome/quickstarts/stagehand) is recommended as it’s built and
maintained by the Browserbase team.

[**Stagehand** \\
\\
**Recommended for AI-native workflows**\\
\\
- JavaScript and Python support\\
- Self-healing page automations\\
- LLM-powered browser control\\
- AI-first architecture](https://docs.browserbase.com/welcome/quickstarts/stagehand)

[**Playwright** \\
\\
**Recommended for traditional automation**\\
\\
- JavaScript, Python, Java, and C# support\\
- Static workflow definitions\\
- Robust testing capabilities\\
- Extensive API support](https://docs.browserbase.com/welcome/quickstarts/playwright)

[**Puppeteer** \\
\\
**Recommended for Puppeteer users**\\
\\
- JavaScript support\\
- Static workflow definitions\\
- Robust testing capabilities\\
- Extensive API support](https://docs.browserbase.com/welcome/quickstarts/puppeteer)

[**Selenium** \\
\\
**Recommended for Selenium users**\\
\\
- JS, Python, Java, C#, and Ruby support\\
- Static workflow definitions\\
- Robust testing capabilities\\
- Extensive API support](https://docs.browserbase.com/welcome/quickstarts/selenium)

### [​](https://docs.browserbase.com/welcome/getting-started\#need-to-deploy-your-code)  Need to deploy your code?

[Functions](https://docs.browserbase.com/platform/runtime/overview) let you deploy browser agents directly to Browserbase’s infrastructure. Perfect for webhooks, scheduled tasks, or API endpoints with zero server management.

[**Functions** \\
\\
**Recommended for serverless workflows**\\
\\
- Zero infrastructure management\\
- API-invocable browser agents\\
- Built-in session management\\
- Perfect for webhooks and scheduled tasks](https://docs.browserbase.com/platform/runtime/overview)

## [​](https://docs.browserbase.com/welcome/getting-started\#use-browserbase-with-claude-code)  Use Browserbase with Claude Code

[**Give your coding agent a browser built for them.** \\
\\
Paste this into your agent to get started:\\
\\
```\\
Read https://browserbase.com/SKILL.md to set up Browserbase\\
```](https://docs.browserbase.com/integrations/skills/introduction)

Was this page helpful?

YesNo

[Previous](https://docs.browserbase.com/welcome/introduction) [SkillsGive your AI coding agent a browser in one prompt\\
\\
Next](https://docs.browserbase.com/welcome/quickstarts/skills)

Ctrl+I

On this page

- [Creating your account](https://docs.browserbase.com/welcome/getting-started#creating-your-account)
- [Overview dashboard](https://docs.browserbase.com/welcome/getting-started#overview-dashboard)
- [Using the playground](https://docs.browserbase.com/welcome/getting-started#using-the-playground)
- [Session Inspector](https://docs.browserbase.com/welcome/getting-started#session-inspector)
- [Sessions list](https://docs.browserbase.com/welcome/getting-started#sessions-list)
- [Next steps](https://docs.browserbase.com/welcome/getting-started#next-steps)
- [Using browser sessions](https://docs.browserbase.com/welcome/getting-started#using-browser-sessions)
- [Need to deploy your code?](https://docs.browserbase.com/welcome/getting-started#need-to-deploy-your-code)
- [Use Browserbase with Claude Code](https://docs.browserbase.com/welcome/getting-started#use-browserbase-with-claude-code)

Assistant

Responses are generated using AI and may contain mistakes.

![](https://mintcdn.com/browserbase/giE_cpy18f2mWHqr/images/getting-started/overview.png?w=840&fit=max&auto=format&n=giE_cpy18f2mWHqr&q=85&s=b86d968eafa7c45cce47ab2788256536)

![](https://mintcdn.com/browserbase/giE_cpy18f2mWHqr/images/getting-started/sessions.png?w=840&fit=max&auto=format&n=giE_cpy18f2mWHqr&q=85&s=1c7659f9e442074ab7c45a08f47d3f9f)