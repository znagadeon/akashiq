// Finds guards(decision, …) calls in test files and the tests that wrap them.
import ts from "typescript";
import { isReference, lineOf, parse, rootName } from "./syntax.ts";

export interface GuardingTest {
  /** Source text of the decision passed to guards. Matches a decision's ID. */
  decision: string;
  file: string;
  line: number;
  /** describe and it names joined with › . */
  name: string;
}

/** For each guards(decision, …), the name and line of the test around it. Outside a test, the line of the guards call. */
export function parseGuards(file: string, source: string): GuardingTest[] {
  const sourceFile = parse(file, source);
  const found: GuardingTest[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "guards" &&
      isReference(node.arguments[0])
    ) {
      const names: string[] = [];
      let test: ts.Node | undefined;
      for (let current = node.parent; current; current = current.parent) {
        if (!ts.isCallExpression(current) || !current.arguments[0]) continue;
        const root = rootName(current.expression);
        if (root === "it" || root === "test" || root === "describe") {
          names.unshift(title(current.arguments[0], sourceFile));
          if (root !== "describe") test ??= current;
        }
      }
      found.push({
        decision: node.arguments[0].getText(sourceFile).replace(/\s+/g, ""),
        file,
        line: lineOf(test ?? node, sourceFile),
        name: names.join(" › "),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/** A string name as its value; other expressions, such as template literals, as source text. */
function title(node: ts.Expression, sourceFile: ts.SourceFile): string {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : node.getText(sourceFile);
}
