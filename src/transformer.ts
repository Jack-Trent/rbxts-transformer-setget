import ts, { PostfixUnaryExpression, PrefixUnaryExpression } from "typescript";
import { } from "ts-expose-internals";

export interface TransformerConfig {
  _: void;
}

export class TransformContext {
  public factory: ts.NodeFactory;
  constructor(
    public program: ts.Program,
    public context: ts.TransformationContext,
    public config: TransformerConfig
  ) {
    this.factory = context.factory;
  }

  transformBinary<T extends ts.Node>(node: T): T {
    return ts.visitEachChild(
      node,
      (node) => transformBinaryExpressions(this, node),
      this.context
    );
  }
  transformAccessor<T extends ts.Node>(node: T): T {
    return ts.visitEachChild(
      node,
      (node) => transformAccessorDeclarations(this, node),
      this.context
    );
  }
  transform<T extends ts.Node>(node: T): T {
    let newNode = this.transformBinary(node);
    return this.transformAccessor(newNode);
  }
}

function visitGetAccessorDeclaration(
  context: TransformContext,
  node: ts.GetAccessorDeclaration
): ts.MethodDeclaration {
  const { factory } = context;
  return factory.createMethodDeclaration(
    undefined,
    undefined,
    factory.createIdentifier("_get" + node.name.getText()),
    undefined,
    undefined,
    [],
    node.type,
    node.body
  );
}

function visitSetAccessorDeclaration(
  context: TransformContext,
  node: ts.SetAccessorDeclaration
): ts.MethodDeclaration {
  const { factory } = context;
  return factory.createMethodDeclaration(
    undefined,
    undefined,
    factory.createIdentifier("_set" + node.name.getText()),
    undefined,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        factory.createIdentifier(node.parameters[0].getText()),
        undefined,
        undefined,
        //node.parameters[0].type, // Get parameter type from accessor declaration?
        undefined
      ),
    ],
    factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    node.body
  );
}

function visitPropertyAccessExpression(
  context: TransformContext,
  node: ts.PropertyAccessExpression
) {
  const { factory } = context;
  const dec = context.program
    .getTypeChecker()
    .getSymbolAtLocation(node)?.valueDeclaration;
  if (
    dec?.kind === ts.SyntaxKind.SetAccessor ||
    dec?.kind === ts.SyntaxKind.GetAccessor
  ) {
    if (
      node.parent &&
      ts.isAssignmentExpression(node.parent) &&
      node.parent.left === node &&
      node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      return context.transform(node);
    } else if (dec?.kind === ts.SyntaxKind.GetAccessor) {
      return factory.createMethodCall(
        node.expression,
        factory.createIdentifier("_get" + node.name.getText()),
        []
      );
    }
  }
  return context.transformAccessor(node);
}

function visitBinaryExpression(
  context: TransformContext,
  node: ts.BinaryExpression
): ts.Node | ts.Node[] {
  const { factory } = context;
  const dec = context.program
    .getTypeChecker()
    .getSymbolAtLocation(node.left)?.valueDeclaration;
  if (
    dec?.kind === ts.SyntaxKind.SetAccessor ||
    dec?.kind === ts.SyntaxKind.GetAccessor
  ) {
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isPropertyAccessExpression(node.left)) {
        return factory.createMethodCall(
          node.left.expression,
          factory.createIdentifier("_set" + node.left.name.getText()),
          [node.right]
        );
      }
    } else if (
      node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.PercentEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.AmpersandEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.CaretEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.LessThanLessThanEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.AsteriskAsteriskEqualsToken
    ) {
      if (ts.isPropertyAccessExpression(node.left)) {
        let token: ts.SyntaxKind = ts.SyntaxKind.PlusToken;
        switch (node.operatorToken.kind) {
          case ts.SyntaxKind.PlusEqualsToken:
            token = ts.SyntaxKind.PlusToken;
            break;
          case ts.SyntaxKind.MinusEqualsToken:
            token = ts.SyntaxKind.MinusToken;
            break;
          case ts.SyntaxKind.SlashEqualsToken:
            token = ts.SyntaxKind.SlashToken;
            break;
          case ts.SyntaxKind.AsteriskEqualsToken:
            token = ts.SyntaxKind.AsteriskToken;
            break;
          case ts.SyntaxKind.PercentEqualsToken:
            token = ts.SyntaxKind.PercentToken;
            break;
          case ts.SyntaxKind.AmpersandEqualsToken:
            token = ts.SyntaxKind.AmpersandToken;
            break;
          case ts.SyntaxKind.BarEqualsToken:
            token = ts.SyntaxKind.BarToken;
            break;
          case ts.SyntaxKind.CaretEqualsToken:
            token = ts.SyntaxKind.CaretToken;
            break;
          case ts.SyntaxKind.BarBarEqualsToken:
            token = ts.SyntaxKind.BarBarToken;
            break;
          case ts.SyntaxKind.AmpersandAmpersandEqualsToken:
            token = ts.SyntaxKind.AmpersandAmpersandToken;
            break;
          case ts.SyntaxKind.QuestionQuestionEqualsToken:
            token = ts.SyntaxKind.QuestionQuestionToken;
            break;
          case ts.SyntaxKind.LessThanLessThanEqualsToken:
            token = ts.SyntaxKind.LessThanLessThanToken;
            break;
          case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
            token = ts.SyntaxKind.GreaterThanGreaterThanToken;
            break;
          case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
            token = ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken;
            break;
          case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
            token = ts.SyntaxKind.AsteriskAsteriskToken;
            break;
        }
        return factory.createMethodCall(
          node.left.expression,
          factory.createIdentifier("_set" + node.left.name.getText()),
          [
            factory.createBinaryExpression(
              node.left,
              factory.createToken(token),
              node.right
            ),
          ]
        );
      }
    }
  }
  return context.transformBinary(node);
}

function transformBinaryExpressions(
  context: TransformContext,
  node: ts.Node
): ts.Node | ts.Node[] {
  if (ts.isBinaryExpression(node)) {
    return visitBinaryExpression(context, node);
  }
  return context.transformBinary(node);
}

function transformAccessorDeclarations(
  context: TransformContext,
  node: ts.Node
): ts.Node | ts.Node[] {
  if (ts.isGetAccessorDeclaration(node)) {
    return visitGetAccessorDeclaration(context, node);
  } else if (ts.isPropertyAccessExpression(node)) {
    return visitPropertyAccessExpression(context, node);
  } else if (ts.isSetAccessorDeclaration(node)) {
    return visitSetAccessorDeclaration(context, node);
  }
  return context.transformAccessor(node);
}
