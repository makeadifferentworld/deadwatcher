import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import { parse } from "acorn";
import * as walk from "acorn-walk";

export async function analyzeJS(jsFiles) {
    const eslint = new ESLint({
        overrideConfigFile: path.resolve(process.cwd(), "eslint.config.js")
    });

    const lintResults = [];
    const allDecl = new Map();
    const allRefs = new Set();

    for (const file of jsFiles) {
        const code = fs.readFileSync(file, "utf8");

        const result = await eslint.lintText(code, { filePath: file });
        result.forEach(r =>
            lintResults.push(
                ...r.messages.map(m => ({
                    file,
                    line: m.line,
                    message: m.message,
                    ruleId: m.ruleId,
                    severity: m.severity
                }))
            )
        );

        try {
            const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" });
            walk.simple(ast, {
                FunctionDeclaration(node) {
                    if (node.id?.name) allDecl.set(node.id.name, file);
                },
                Identifier(node) {
                    allRefs.add(node.name);
                }
            });
        } catch (e) {
            lintResults.push({
                file,
                line: 0,
                message: "Error de sintaxis",
                ruleId: "parse-error",
                severity: 2
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