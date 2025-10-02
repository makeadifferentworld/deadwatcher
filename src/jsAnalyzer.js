import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import { parse } from "acorn";
import * as walk from "acorn-walk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const internalConfigPath = path.join(__dirname, "../eslint.config.js");

const allowedGlobals = new Set([
  "console",
  "process",
  "require",
  "module",
  "__dirname",
  "window",
  "document",
  "test",
  "expect",
  "URLSearchParams",
  "setTimeout",
  "MercadoPago",
  "alert",
  "URL",
  "setInterval",
  "clearTimeout",
]);

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
        globals: Object.fromEntries([...allowedGlobals].map(g => [g, "readonly"])),
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

  const lintErrors = [];
  const lintWarnings = [];
  const allDecl = new Map();
  const allRefs = new Set();
  const perFileDecl = new Map();

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, "utf8");

    try {
      const result = await eslint.lintText(code, { filePath: file });
      result.forEach((r) =>
        r.messages.forEach((m) => {
          if (m.ruleId === "no-undef") {
            const match = m.message.match(/'([A-Za-z0-9_$]+)'/);
            if (match && allowedGlobals.has(match[1])) return;
          }

          const entry = {
            file,
            line: m.line,
            message: m.message,
            ruleId: m.ruleId,
            severity: m.severity,
          };

          if (m.severity === 1) {
            lintWarnings.push(entry);
          } else {
            lintErrors.push(entry);
          }
        })
      );
    } catch (e) {
      lintErrors.push({
        file,
        line: 0,
        message: `Error al lint: ${e.message}`,
        ruleId: "lint-error",
        severity: 2,
      });
    }

    try {
      const ast = parse(code, { ecmaVersion: "latest", sourceType: "module", locations: true });

      walk.simple(ast, {
        FunctionDeclaration(node) {
          if (node.id?.name) {
            const name = node.id.name;
            if (!allDecl.has(name)) allDecl.set(name, file);

            if (!perFileDecl.has(file)) perFileDecl.set(file, new Set());
            const set = perFileDecl.get(file);
            if (set.has(name)) {
              lintWarnings.push({
                file,
                line: node.loc?.start?.line || 0,
                message: `Función duplicada '${name}' en el mismo archivo.`,
                ruleId: "duplicate-function",
                severity: 1,
              });
            } else {
              set.add(name);
            }
          }
        },

        CallExpression(node) {
          if (node.callee && node.callee.type === "Identifier") {
            allRefs.add(node.callee.name);
          }
        },
        NewExpression(node) {
          if (node.callee && node.callee.type === "Identifier") {
            allRefs.add(node.callee.name);
          }
        },
      });
    } catch (err) {
      lintErrors.push({
        file,
        line: err.loc?.start?.line || 0,
        message: `Error de sintaxis: ${err.message}`,
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

  return { lintErrors, lintWarnings, unusedFuncs };
}
