Browserbase makes it easy to run real browsers in production. But until now, using Browserbase still meant running your automation code **somewhere else.**

That usually meant maintaining a second system just to keep [Stagehand](https://docs.stagehand.dev/v3/first-steps/introduction) or Playwright scripts alive.

We’ve launched Browserbase Functions to remove this layer completely.

Functions let you deploy agents and automations directly to Browserbase and run it next to the browser session it controls. You define, deploy, and invoke a function, and Browserbase handles execution, browser lifecycle, and results as one system.

For teams, that means fewer moving parts and less infrastructure to operate. For automations, it means lower latency and fewer failure points.

Functions are built for browser workloads, not generic request handlers. They support real [Stagehand](https://docs.stagehand.dev/v3/first-steps/introduction) or Playwright code, long-running executions, and asynchronous invocation. Each function runs with a dedicated Browserbase session and returns structured results when it completes.

Deployments are versioned by default. New code doesn’t affect production until you explicitly promote it, so you can test changes safely without rewriting endpoints or workflows.

Local development works the same way. When you run Functions locally, your code connects to real Browserbase browser sessions using your credentials. There’s no mock environment to drift from production behaviour.

Functions are available today for TypeScript!

If you’re already using Browserbase, you can move existing automations into Functions and stop managing separate runner infrastructure. If you’re new, Functions give you a single place to run both the browser and the code that drives it.

You can get started by initializing a Functions project:

```bash
npx @browserbasehq/sdk-functions init
```

[Here’s the docs](https://docs.browserbase.com/features/functions).

If you want a deeper look at how Functions works and the engineering decisions behind it, [we’ve published a full technical deep dive as well](https://www.browserbase.com/blog/building-browserbase-functions).

Browserbase Functions are the next step toward making browser automation faster and easier to run in production.

## Keep reading

![](https://cdn.sanity.io/images/yd6zslid/production/4c0655f69ea346fb71c5ce1f5b5ced500782d850-2568x1737.png&w=1100&q=85&auto=format)

### APIs see 15% of the web. Unlock the other 85% with the Browserbase Platform

Paul Klein

April 07, 2026

Company

[Read more](https://www.browserbase.com/blog/platform)

![](https://cdn.sanity.io/images/yd6zslid/production/c0acbc613def71b6d203c87cd28e24a94f7e2ba2-2568x1737.png&w=1100&q=85&auto=format)

### Showing up on the web with agent identity

Peyton Casper & Harsehaj Dhami

April 06, 2026

Company

[Read more](https://www.browserbase.com/blog/identity)

![](https://cdn.sanity.io/images/yd6zslid/production/c0acbc613def71b6d203c87cd28e24a94f7e2ba2-2568x1737.png&w=1100&q=85&auto=format)

### Introducing Browserbase Search

Thomas Katwan & Harsehaj Dhami

March 17, 2026

Company

[Read more](https://www.browserbase.com/blog/search)

![](https://cdn.sanity.io/images/yd6zslid/production/330158fd5dbcded6fb015d3cfacfc7373ebfa942-2568x1737.png&w=1100&q=85&auto=format)

### Introducing Fetch: the simplest way to read the web

Harsehaj Dhami

March 11, 2026

Company

[Read more](https://www.browserbase.com/blog/fetch-api)

[View all blog posts](https://www.browserbase.com/blog)