import type { Decision } from "@akashiq/core";

export const dashboardDecisions = {
  staticFiles: {
    decision: "Serve the dashboard as static files shipped with akashiq, and the project scan as JSON",
  } satisfies Decision,
  liveData: {
    decision: "Watch the project and tell the open dashboard to reload its data when decision or test files change",
  } satisfies Decision,
  plainScript: {
    decision: "Write the dashboard UI in plain JavaScript type-checked through JSDoc, with no framework or build step",
    unconfirmed: true,
  } satisfies Decision,
};
