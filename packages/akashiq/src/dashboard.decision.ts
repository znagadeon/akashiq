import type { Decision } from "@akashiq/core";

export const dashboardDecisions = {
  staticFiles: {
    decision: "Serve the dashboard as static files shipped with Akashiq, and the project scan as JSON",
  } satisfies Decision,
  liveData: {
    decision: "Watch the project and tell the open dashboard to reload its data when decision or test files change",
  } satisfies Decision,
  plainScript: {
    decision: "Write the dashboard UI in plain JavaScript type-checked through JSDoc, with no framework or build step",
    reason: "Consider a framework only once the UI gets heavy enough to need one",
  } satisfies Decision,
  defaultPort: {
    decision: "Serve the dashboard on a fixed default port that spells akashiq in leet (AkAShIQ), unless --port is given",
    value: 44519,
  } satisfies Decision<number>,
  warnGuardedUnimplemented: {
    decision: "Warn on the dashboard about decisions still marked unimplemented that a test already guards",
    reason: "So the flag doesn't stay behind once the decision is implemented",
  } satisfies Decision,
  countUnimplementedInGuardedTotals: {
    decision: "Count unimplemented decisions in the dashboard's guarded totals like any other decision",
  } satisfies Decision,
};
