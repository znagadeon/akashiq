// Finds the lines that guard each decision in a test file, and counts their assertions. Pure; never runs git.
import ts from "typescript";
import { isReference, parse, rootName } from "../parser/syntax.ts";
import { type Hunk, touches } from "./diff.ts";

export interface GuardedRange {
  decision: string;
  /** 1-based, inclusive. */
  start: number;
  end: number;
  /** Set when the range is a helper the guarding test uses, to its name. */
  helper?: string;
}

/**
 * For each guards(decision, …), the lines that guard the decision: the whole it(…) call around it, including its name and an it.each table,
 * and the declarations in the same file that the test uses, followed transitively.
 * Helpers count because changing only a helper can leave the test checking a situation unrelated to the decision.
 * Other files, including product code, are not followed. Matching is by name, so shadowing can widen a range; that beats missing a change.
 */
export function guardedRanges(path: string, source: string): GuardedRange[] {
  const file = parse(path, source);
  const line = (position: number) => file.getLineAndCharacterOfPosition(position).line + 1;
  const span = (node: ts.Node) => ({ start: line(node.getStart(file)), end: line(node.getEnd()) });

  const declarations = new Map<string, ts.Node[]>();
  const declare = (name: string, node: ts.Node) => declarations.set(name, [...(declarations.get(name) ?? []), node]);
  const guardsCalls: ts.CallExpression[] = [];
  const collect = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) declare(node.name.text, node);
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) declare(declaration.name.text, node);
      }
    }
    if (isGuardsCall(node)) guardsCalls.push(node);
    ts.forEachChild(node, collect);
  };
  collect(file);

  const isAncestor = (ancestor: ts.Node, node: ts.Node) => {
    for (let current: ts.Node | undefined = node; current; current = current.parent) if (current === ancestor) return true;
    return false;
  };
  const contains = (outer: ts.Node, inner: ts.Node) => outer.getStart(file) <= inner.getStart(file) && inner.getEnd() <= outer.getEnd();
  // A declaration is visible where its block is an ancestor of the use. This skips same-named locals inside other tests.
  const visibleDeclarations = (name: string, from: ts.Node) =>
    (declarations.get(name) ?? []).filter((declaration) => isAncestor(declaration.parent, from));
  const references = (node: ts.Node) => {
    const found: ts.Identifier[] = [];
    const visit = (child: ts.Node) => {
      if (ts.isIdentifier(child) && !isPropertyName(child)) found.push(child);
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  const ranges: GuardedRange[] = [];
  for (const call of guardsCalls) {
    const decision = decisionOf(call, file);
    const test = enclosingTest(call) ?? call;
    ranges.push({ decision, ...span(test) });

    const seen = new Set<ts.Node>();
    const queue: ts.Node[] = [test];
    while (queue.length > 0) {
      const node = queue.shift() as ts.Node;
      for (const reference of references(node)) {
        for (const declaration of visibleDeclarations(reference.text, reference)) {
          if (seen.has(declaration) || contains(test, declaration)) continue;
          seen.add(declaration);
          ranges.push({ decision, ...span(declaration), helper: reference.text });
          queue.push(declaration);
        }
      }
    }
  }
  return ranges;
}

/** The guarded ranges in one side of a diff (before or after the change) that the hunks changed. */
export function touchedRanges(path: string, source: string, hunks: Hunk[]): GuardedRange[] {
  return guardedRanges(path, source).filter((range) => hunks.some((hunk) => touches(range, hunk)));
}

/**
 * For each decision, the number of expect(…) calls in the tests that guard it, before and after a change, so a change that drops assertions stands out.
 * Tests are matched by name, and a test counts on both sides if it guards the decision on either side.
 * Summing per decision alone would show a change that wraps a test in guards while dropping an assertion as a gain.
 */
export function assertionChange(
  before: { path: string; source: string },
  after: { path: string; source: string },
): Map<string, { from: number; to: number }> {
  const [old, next] = [testsOf(before.path, before.source), testsOf(after.path, after.source)];
  const decisions = new Map<string, Set<string>>();
  for (const tests of [old, next]) {
    for (const [name, test] of tests) {
      for (const decision of test.decisions) decisions.set(decision, (decisions.get(decision) ?? new Set()).add(name));
    }
  }
  const sum = (tests: Map<string, TestAssertions>, names: Set<string>) =>
    [...names].reduce((total, name) => total + (tests.get(name)?.expects ?? 0), 0);
  return new Map([...decisions].map(([decision, names]) => [decision, { from: sum(old, names), to: sum(next, names) }]));
}

interface TestAssertions {
  expects: number;
  decisions: Set<string>;
}

/** For each test name (the source text of its first argument), its expect count and the decisions it guards. Same-named tests are merged. */
function testsOf(path: string, source: string): Map<string, TestAssertions> {
  const file = parse(path, source);
  const tests = new Map<string, TestAssertions>();
  const visit = (node: ts.Node, test: TestAssertions | undefined) => {
    let current = test;
    if (ts.isCallExpression(node) && isTestCall(node) && node.arguments[0]) {
      const name = node.arguments[0].getText(file);
      current = tests.get(name) ?? { expects: 0, decisions: new Set() };
      tests.set(name, current);
    }
    if (current && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "expect") current.expects += 1;
    if (current && isGuardsCall(node)) current.decisions.add(decisionOf(node, file));
    ts.forEachChild(node, (child) => visit(child, current));
  };
  visit(file, undefined);
  return tests;
}

function isGuardsCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "guards" && isReference(node.arguments[0])
  );
}

/** The decision ID a guards call passes, written the same way the parser writes it. */
function decisionOf(call: ts.CallExpression, file: ts.SourceFile): string {
  return (call.arguments[0] as ts.Expression).getText(file).replace(/\s+/g, "");
}

function isTestCall(node: ts.CallExpression): boolean {
  const root = rootName(node.expression);
  return root === "it" || root === "test";
}

/** The nearest it(…) or test(…) call around the node, including it.each(table)(…) and it.only(…). */
function enclosingTest(node: ts.Node): ts.CallExpression | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isCallExpression(current) && isTestCall(current)) return current;
  }
  return undefined;
}

/** A name that doesn't refer to a variable, such as `player` in `result.player` or `{ player: … }`. */
function isPropertyName(identifier: ts.Identifier): boolean {
  const parent = identifier.parent;
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
    (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
    (ts.isPropertySignature(parent) && parent.name === identifier) ||
    (ts.isBindingElement(parent) && parent.propertyName === identifier)
  );
}
