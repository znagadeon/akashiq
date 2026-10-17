// Reads decisions from the source of a *.decision.ts file without running it.
import ts from "typescript";
import { lineOf, parse, propertyName, unwrap } from "./syntax.js";

export interface DecisionEntry {
  /** Key path from the exported object, such as `coreDecisions.separateAnyDecision`. Tests pass the same expression to guards. */
  id: string;
  file: string;
  line: number;
  decision?: string;
  reason?: string;
  /** Source text of `value`, without a top-level `as` or `satisfies`. */
  value?: string;
  /** `value` refers to other code (a constant, a spread, a call), so its text doesn't show the actual value. */
  nonLiteralValue?: true;
  unconfirmed?: true;
  /** IDs listed in `dependsOn`. */
  dependsOn: string[];
}

/**
 * Collects decisions from exported objects. Usually each property of `xxxDecisions` is a decision; if the exported object is itself a decision, its name is the ID.
 * An object literal is a decision when it has a `decision` or `reason` property.
 */
export function parseDecisions(file: string, source: string): DecisionEntry[] {
  const sourceFile = parse(file, source);
  const found: DecisionEntry[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
      continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const exported = unwrap(declaration.initializer);
      if (!ts.isObjectLiteralExpression(exported)) continue;
      const name = declaration.name.text;
      if (isDecision(exported)) {
        found.push(entry(name, file, lineOf(declaration, sourceFile), exported, sourceFile));
        continue;
      }
      for (const property of exported.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const key = propertyName(property.name);
        const initializer = unwrap(property.initializer);
        if (key !== undefined && ts.isObjectLiteralExpression(initializer) && isDecision(initializer)) {
          found.push(entry(`${name}.${key}`, file, lineOf(property, sourceFile), initializer, sourceFile));
        }
      }
    }
  }
  return found;
}

function isDecision(object: ts.ObjectLiteralExpression): boolean {
  return object.properties.some((property) => {
    const name = property.name && propertyName(property.name);
    return name === "decision" || name === "reason";
  });
}

function entry(id: string, file: string, line: number, object: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): DecisionEntry {
  const properties = new Map<string, ts.Expression>();
  for (const property of object.properties) {
    const name = ts.isPropertyAssignment(property) ? propertyName(property.name) : undefined;
    if (ts.isPropertyAssignment(property) && name !== undefined) properties.set(name, property.initializer);
  }
  const text = (name: string) => {
    const node = properties.get(name);
    if (!node) return undefined;
    return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : node.getText(sourceFile);
  };
  const decision = text("decision");
  const reason = text("reason");
  const value = properties.get("value");
  return {
    id,
    file,
    line,
    ...(decision !== undefined ? { decision } : {}),
    ...(reason !== undefined ? { reason } : {}),
    ...(value ? { value: dedent(unwrap(value).getText(sourceFile)) } : {}),
    ...(value && !isLiteral(value) ? { nonLiteralValue: true as const } : {}),
    ...(properties.get("unconfirmed")?.kind === ts.SyntaxKind.TrueKeyword ? { unconfirmed: true as const } : {}),
    dependsOn: dependencies(properties.get("dependsOn"), sourceFile),
  };
}

/** IDs in `dependsOn: (): AnyDecision[] => [a.b, c.d]`, with whitespace removed. */
function dependencies(node: ts.Expression | undefined, sourceFile: ts.SourceFile): string[] {
  if (!node || !ts.isArrowFunction(node) || ts.isBlock(node.body)) return [];
  const body = unwrap(node.body);
  return ts.isArrayLiteralExpression(body) ? body.elements.map((element) => element.getText(sourceFile).replace(/\s+/g, "")) : [];
}

/** Whether the value can be read from its own text: literals, arrays and objects of literals, and arithmetic on them such as `1 / 8`. */
function isLiteral(node: ts.Expression): boolean {
  node = unwrap(node);
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return true;
  }
  if (ts.isIdentifier(node)) return node.text === "undefined" || node.text === "Infinity" || node.text === "NaN";
  if (ts.isPrefixUnaryExpression(node)) return isLiteral(node.operand);
  if (ts.isBinaryExpression(node)) return isLiteral(node.left) && isLiteral(node.right);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && isLiteral(element));
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every(
      (property) => ts.isPropertyAssignment(property) && propertyName(property.name) !== undefined && isLiteral(property.initializer),
    );
  }
  return false;
}

/** Removes the indentation the value had inside its file, so a multi-line value reads on its own. */
function dedent(text: string): string {
  const [first = "", ...rest] = text.split("\n");
  const indents = rest.filter((line) => line.trim() !== "").map((line) => line.length - line.trimStart().length);
  const indent = Math.min(...indents);
  return [first, ...rest.map((line) => line.slice(Math.min(indent, line.length - line.trimStart().length)))].join("\n");
}
