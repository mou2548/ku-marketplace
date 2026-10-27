import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

/**
 * Loads one TypeScript module for a test: transpiles it to CommonJS and runs
 * it in a fresh context. Every import must be listed in `stubs`
 * (specifier -> module object); type-only imports are erased and need none.
 */
export function loadTs(path, stubs = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const cjs = { exports: {} };
  const require = (specifier) => {
    if (specifier in stubs) return stubs[specifier];
    throw new Error(`${path}: no stub for import "${specifier}"`);
  };
  vm.runInNewContext(source, {
    module: cjs,
    exports: cjs.exports,
    require,
    Intl,
    Date,
    Math,
    Number,
    String,
    Promise,
    Error,
    ...globals,
  });
  return cjs.exports;
}
