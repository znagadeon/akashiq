import ts from "typescript";

export function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
}

/** 1-based line where the node starts. */
export function lineOf(node: ts.Node, file: ts.SourceFile): number {
  return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
}

/** Strips parentheses, `as`, and `satisfies`, which don't change the value. */
export function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
  return node;
}

/** The name of a property written as an identifier or a string. Computed names have none. */
export function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;
}

/** A name or a property path such as `cartDecisions.freeShipping`. Anything else, such as an inline object, doesn't point to a decision. */
export function isReference(node: ts.Expression | undefined): node is ts.Identifier | ts.PropertyAccessExpression {
  if (!node) return false;
  return ts.isIdentifier(node) || (ts.isPropertyAccessExpression(node) && isReference(node.expression));
}

/** `it` for `it(…)`, `it.each(…)(…)`, and `it.only(…)`. */
export function rootName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return rootName(expression.expression);
  if (ts.isCallExpression(expression)) return rootName(expression.expression);
  return undefined;
}
