import type { AnyDecision, Decision } from "@akashiq/core";

export const skillDecisions = {
  shipAsSkill: {
    decision: "Ship the guidelines for writing decisions and tests as an Agent Skill inside the akashiq package",
    reason: "Skills are commonly shipped through npm now, and in this monorepo it costs little",
  } satisfies Decision,
  installByCopy: {
    decision:
      "`akashiq skill install` copies the skill into the project, .agents/skills by default, instead of relying on a third-party skill installer",
    reason: "Shipping skills through npm has only community conventions so far, with no official standard",
    dependsOn: (): AnyDecision[] => [skillDecisions.shipAsSkill],
  } satisfies Decision,
};
