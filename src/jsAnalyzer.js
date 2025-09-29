import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import { parse } from "acorn";
import * as walk from "acorn-walk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const internalConfigPath = path.join(__dirname, "../eslint.config.js");

function createESLintInstance() {
  const eslintOptions = {};

  if (fs.existsSync(internalConfigPath)) {
    eslintOptions.overrideConfigFile = internalConfigPath;
  } else {
    eslintOptions.overrideConfig = {
      languageOptions: {
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
        globals: {
          console: "readonly",
          process: "readonly",
          require: "readonly",
          module: "readonly",
          __dirname: "readonly",
          window: "readonly",
          document: "readonly",
          test: "readonly",
          expect: "readonly",
        },
      },
      rules: {
        "no-unused-vars": "warn",
        "no-undef": "error",
        "no-console": "off",
        "no-var": "error",
        "prefer-const": "warn",
        eqeqeq: "warn",
        "no-with": "error",
        "no-new-object": "warn",
        "prefer-arrow-callback": "warn",
      },
    };
  }

  return new ESLint(eslintOptions);
}

export async function analyzeJS(jsFiles) {
  const eslint = createESLintInstance();

  const lintResults = [];
  const allDecl = new Map();
  const allRefs = new Set();

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, "utf8");

    try {
      const result = await eslint.lintText(code, { filePath: file });
      result.forEach((r) =>
        lintResults.push(
          ...r.messages.map((m) => ({
            file,
            line: m.line,
            message: m.message,
            ruleId: m.ruleId,
            severity: m.severity,
          }))
        )
      );
    } catch (e) {
      lintResults.push({
        file,
        line: 0,
        message: `Error al lint: ${e.message}`,
        ruleId: "lint-error",
        severity: 2,
      });
    }

    try {
      const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" });
      walk.simple(ast, {
        FunctionDeclaration(node) {
          if (node.id?.name) allDecl.set(node.id.name, file);
        },
        Identifier(node) {
          allRefs.add(node.name);
        },
      });
    } catch (e) {
      lintResults.push({
        file,
        line: 0,
        message: "Error de sintaxis",
        ruleId: "parse-error",
        severity: 2,
      });
    }
  }

  const unusedFuncs = [];
  for (const [name, file] of allDecl.entries()) {
    if (!allRefs.has(name)) {
      unusedFuncs.push({ name, file });
    }
  }

  return { lintResults, unusedFuncs };
}
