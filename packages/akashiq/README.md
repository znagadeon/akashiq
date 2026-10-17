# akashiq

**Remember why your code exists.**

Akashiq is a decision tracing tool that remembers why your code is the way it is. It records the decisions behind your code, with their reasons, as typed objects in TypeScript, and links each one to the tests that prove it.

This package holds the dashboard, the CLI, and the agent skill. It needs Node.js 22.17 or later. The `Decision` types and `guards` are in [`@akashiq/core`](https://www.npmjs.com/package/@akashiq/core).

```bash
npm install --save-dev akashiq @akashiq/core

npx akashiq dashboard                           # http://127.0.0.1:44519/
npx akashiq skill install                       # .agents/skills/akashiq
npx akashiq skill install --dir .claude/skills  # Claude Code
```

See the [README on GitHub](https://github.com/znagadeon/akashiq#readme) for how to record decisions and guard them with tests.

## License

MIT
