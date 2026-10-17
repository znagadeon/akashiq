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
};
