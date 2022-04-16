import ts from "typescript";
import {} from "ts-expose-internals";

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
    undefined,
    factory.createIdentifier("_set" + node.name.getText()),
    undefined,
    undefined,
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        factory.createIdentifier(node.parameters[0].getText()),
        undefined,
        undefined // Get parameter type from accessor declaration?
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
) {
  const { factory } = context;
  const dec = context.program
    .getTypeChecker()
    .getSymbolAtLocation(node.left)?.valueDeclaration;
  if (
    dec?.kind === ts.SyntaxKind.SetAccessor ||
    dec?.kind === ts.SyntaxKind.GetAccessor
  ) {
    let rhs: ts.Expression = node.right;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusEqualsToken:
        rhs = factory.createBinaryExpression(
          node.left,
          factory.createToken(ts.SyntaxKind.PlusToken),
          node.right
        );
        break;
      case ts.SyntaxKind.MinusEqualsToken:
        rhs = factory.createBinaryExpression(
          node.left,
          factory.createToken(ts.SyntaxKind.MinusToken),
          node.right
        );
        break;
      case ts.SyntaxKind.SlashEqualsToken:
        rhs = factory.createBinaryExpression(
          node.left,
          factory.createToken(ts.SyntaxKind.SlashToken),
          node.right
        );
        break;
      case ts.SyntaxKind.AsteriskEqualsToken:
        rhs = factory.createBinaryExpression(
          node.left,
          factory.createToken(ts.SyntaxKind.AsteriskToken),
          node.right
        );
        break;
      default:
        break;
    }
    if (ts.isPropertyAccessExpression(node.left)) {
      // console.log(node.left.getText());
      return factory.createMethodCall(
        node.left.expression,
        factory.createIdentifier("_set" + node.left.name.getText()),
        [rhs]
      );
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
