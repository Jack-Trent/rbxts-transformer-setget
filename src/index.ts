/*
ISC License

Copyright (c) 2020, Fireboltofdeath

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
import ts from "typescript";
import { TransformContext, TransformerConfig } from "./transformer";

export default function (program: ts.Program, config: TransformerConfig) {
  return (
    transformationContext: ts.TransformationContext
  ): ((file: ts.SourceFile) => ts.Node) => {
    const context = new TransformContext(
      program,
      transformationContext,
      config
    );
    return (file) => context.transform(file);
  };
}
