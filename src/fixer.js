import fs from "fs";
import path from "path";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";
import { parse } from "acorn";
import * as walk from "acorn-walk";
import readline from "readline";

function askQuestion(rl, q) {
  return new Promise(resolve => {
    rl.question(q, ans => resolve(ans.trim()));
  });
}
function nowTs() {
  return Date.now().toString();
}
function backupFile(file) {
  try {
    const bakDir = path.dirname(file);
    const bak = `${file}.deadwatcher.bak.${nowTs()}`;
    fs.copyFileSync(file, bak);
    return bak;
  } catch (e) {
    return null;
  }
}

function writePatchFile(id, filePath, patchText) {
  const baseDir = path.resolve(process.cwd(), "deadwatcher_patches");
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  const pname = path.join(baseDir, `${id}_${path.basename(filePath)}.diff`);
  fs.writeFileSync(pname, patchText, "utf8");
  return pname;
}

function simpleUnifiedDiff(original, modified, filePath) {
  const oLines = original.split("\n");
  const mLines = modified.split("\n");
  const max = Math.max(oLines.length, mLines.length);
  let diff = `*** ${filePath}\n--- ${filePath}\n`;
  for (let i = 0; i < max; i++) {
    const o = oLines[i];
    const m = mLines[i];
    if (o === undefined) {
      diff += `+${m}\n`;
    } else if (m === undefined) {
      diff += `-${o}\n`;
    } else if (o !== m) {
      diff += `-${o}\n+${m}\n`;
    } else {
      diff += ` ${o}\n`;
    }
  }
  return diff;
}

function excerpt(code, start, end, ctx = 3) {
  const lines = code.split("\n");
  const startLine = code.slice(0, start).split("\n").length - 1;
  const endLine = code.slice(0, end).split("\n").length - 1;
  const s = Math.max(0, startLine - ctx);
  const e = Math.min(lines.length - 1, endLine + ctx);
  return lines.slice(s, e + 1).map((l, i) => `${s + i + 1}: ${l}`).join("\n");
}

function collectDefinedClassesFromCss(content) {
  const root = postcss().process(content, { parser: safeParser }).root;
  const defined = new Set();
  root.walkRules(rule => {
    const sels = rule.selectors || [];
    sels.forEach(sel => {
      const matches = sel.match(/\.[A-Za-z0-9\-_]+/g);
      if (matches) matches.forEach(m => defined.add(m.slice(1)));
      const attrMatches = sel.match(/\[class[^\]]+\]/g);
      if (attrMatches) {
        attrMatches.forEach(am => {
          const s = am.match(/["']([^"']+)["']/);
          if (s && s[1]) s[1].split(/\s+/).forEach(c => defined.add(c));
        });
      }
    });
  });
  return Array.from(defined);
}

export async function generatePatchesForResults(results, fileLists = {}) {
  const cssFiles = fileLists.cssFiles || [];
  const jsFiles = fileLists.jsFiles || [];
  const patches = [];
  const suggestions = [];
  const ts = nowTs();

  if (results.unusedClasses && results.unusedClasses.length) {
    for (const cssFile of cssFiles) {
      let original;
      try { original = fs.readFileSync(cssFile, "utf8"); } catch (e) { continue; }
      let root;
      try { root = postcss().process(original, { parser: safeParser }).root; } catch (e) { continue; }
      let modifiedFlag = false;

      root.walkRules(rule => {
        const sels = rule.selector.split(",").map(s => s.trim());
        const keep = sels.filter(s => {
          for (const uc of results.unusedClasses) {
            if (new RegExp(`(^|[^A-Za-z0-9_-])\\.${uc}($|[^A-Za-z0-9_-])`).test(s)) {
              return false;
            }
          }
          return true;
        });
        if (keep.length !== sels.length) {
          if (keep.length === 0) {
            rule.remove();
          } else {
            rule.selector = keep.join(", ");
          }
          modifiedFlag = true;
        }
      });

      if (modifiedFlag) {
        const modified = root.toResult().css;
        const patchText = simpleUnifiedDiff(original, modified, cssFile);
        const patchPath = writePatchFile(ts, cssFile, patchText);
        patches.push(patchPath);
        suggestions.push({ file: cssFile, type: "css-class-removal", patch: patchPath, timestamp: ts });
      }
    }
  }

  if (results.jsUnused && results.jsUnused.length) {
    const byFile = results.jsUnused.reduce((m, f) => {
      if (!m[f.file]) m[f.file] = [];
      m[f.file].push(f.name);
      return m;
    }, {});

    for (const [file, names] of Object.entries(byFile)) {
      let original;
      try { original = fs.readFileSync(file, "utf8"); } catch (e) { continue; }
      let ast;
      try { ast = parse(original, { ecmaVersion: "latest", sourceType: "module", ranges: true, locations: true }); } catch (e) { continue; }
      const targets = [];
      walk.simple(ast, {
        FunctionDeclaration(node) {
          if (node.id && names.includes(node.id.name)) {
            targets.push({ name: node.id.name, start: node.start, end: node.end });
          }
        },
        VariableDeclarator(node) {
          if (node.id && node.id.type === "Identifier" && names.includes(node.id.name)) {
            if (node.init && (node.init.type === "FunctionExpression" || node.init.type === "ArrowFunctionExpression")) {
              targets.push({ name: node.id.name, start: node.start, end: node.end });
            }
          }
        }
      });

      if (!targets.length) continue;

      const safeTargets = [];
      for (const t of targets) {
        const regexWord = new RegExp(`\\b${t.name}\\b`, "g");
        let usedElsewhere = false;
        let m;
        while ((m = regexWord.exec(original)) !== null) {
          const pos = m.index;
          if (pos >= t.start && pos <= t.end) continue;
          usedElsewhere = true;
          break;
        }
        if (!usedElsewhere) safeTargets.push(t);
      }

      if (!safeTargets.length) continue;

      let modified = original;
      safeTargets.sort((a, b) => b.start - a.start);
      for (const t of safeTargets) {
        const originalSnippet = modified.slice(t.start, t.end);
        const name = t.name;
        let appearsElsewhereInRepo = false;
        for (const jf of jsFiles) {
          try {
            const jfContent = fs.readFileSync(jf, "utf8");
            if (jfContent.includes(name) && jf !== file) {
              appearsElsewhereInRepo = true;
              break;
            }
          } catch (e) {}
        }
        if (appearsElsewhereInRepo) continue;
        const commented = originalSnippet.split("\n").map(l => `// ${l}`).join("\n");
        const replacement = `/* DEADWATCHER REMOVED FUNCTION: ${name} - ${new Date().toISOString()} */\n// ORIGINAL (kept commented):\n${commented}\n`;
        modified = modified.slice(0, t.start) + replacement + modified.slice(t.end);
      }

      if (modified !== original) {
        const patchText = simpleUnifiedDiff(original, modified, file);
        const patchPath = writePatchFile(ts, file, patchText);
        patches.push(patchPath);
        suggestions.push({ file, type: "js-comment-func", patch: patchPath, timestamp: ts });
      }
    }
  }

  if (suggestions.length) {
    const baseDir = path.resolve(process.cwd(), "deadwatcher_patches");
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    const metaPath = path.join(baseDir, `suggested-changes.${ts}.json`);
    fs.writeFileSync(metaPath, JSON.stringify({ timestamp: ts, suggestions }, null, 2), "utf8");
    patches.push(metaPath);
  }

  return patches;
}

export async function removeCssClassInteractive(unusedClasses, cssFiles, options = {}) {
  if (!unusedClasses || !unusedClasses.length) return { changedFiles: [] };
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const changedFiles = new Set();
  const applyAll = options.applyAll || false;
  const patchesDir = path.resolve(process.cwd(), "deadwatcher_patches");

  for (const cls of unusedClasses) {
    console.log(`\n🔎 Clase detectada: "${cls}"`);
    let doClass = applyAll ? "y" : await askQuestion(rl, `  ¿Procesar ".${cls}" para eliminaciones en CSS? (y = sí / n = no / s = saltar clase): `);
    if (doClass.toLowerCase() === "s" || doClass.toLowerCase() === "n") continue;

    for (const file of cssFiles) {
      let content;
      try { content = fs.readFileSync(file, "utf8"); } catch (e) { continue; }
      let root;
      try { root = postcss().process(content, { parser: safeParser }).root; } catch (e) { continue; }
      let modified = false;

      root.walkRules(rule => {
        const sels = rule.selector.split(",").map(s => s.trim());
        const keep = sels.filter(s => {
          if (new RegExp(`(^|[^A-Za-z0-9_-])\\.${cls}($|[^A-Za-z0-9_-])`).test(s)) return false;
          if (/\[class[^\]]+\]/.test(s)) {
            const am = s.match(/\[class[^\]]+\]/g);
            if (am) {
              for (const a of am) {
                const val = a.match(/["']([^"']+)["']/);
                if (val && val[1].split(/\s+/).includes(cls)) return false;
              }
            }
          }
          return true;
        });
        if (keep.length !== sels.length) {
          if (keep.length === 0) rule.remove(); else rule.selector = keep.join(", ");
          modified = true;
        }
      });

      if (modified) {
        const original = content;
        const resultCss = root.toResult().css;
        if (options.patchOnly) {
          if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir, { recursive: true });
          const patchText = simpleUnifiedDiff(original, resultCss, file);
          const patchPath = writePatchFile(nowTs(), file, patchText);
          console.log(`  📦 Patch creado: ${patchPath}`);
        } else {
          const bak = backupFile(file);
          fs.writeFileSync(file, resultCss, "utf8");
          console.log(`  ✅ Actualizado: ${file} (backup: ${bak || "no disponible"})`);
          changedFiles.add(file);
        }
      }
    }
  }

  rl.close();
  return { changedFiles: Array.from(changedFiles) };
}

export async function removeJsFunctionsInteractive(unusedFuncs, jsFiles, options = {}) {
  if (!unusedFuncs || !unusedFuncs.length) return { changedFiles: [] };
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const changedFiles = new Set();
  const applyAll = options.applyAll || false;
  const patchOnly = options.patchOnly || false;
  const patchesDir = path.resolve(process.cwd(), "deadwatcher_patches");

  const byFile = new Map();
  for (const f of unusedFuncs) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f.name);
  }

  for (const [file, names] of byFile.entries()) {
    let code;
    try { code = fs.readFileSync(file, "utf8"); } catch (e) { continue; }
    let ast;
    try { ast = parse(code, { ecmaVersion: "latest", sourceType: "module", ranges: true, locations: true }); } catch (e) { continue; }

    const targets = [];
    walk.simple(ast, {
      FunctionDeclaration(node) {
        if (node.id && names.includes(node.id.name)) targets.push({ name: node.id.name, start: node.start, end: node.end, loc: node.loc });
      },
      VariableDeclarator(node) {
        if (node.id && node.id.type === "Identifier" && names.includes(node.id.name)) {
          if (node.init && (node.init.type === "FunctionExpression" || node.init.type === "ArrowFunctionExpression")) {
            targets.push({ name: node.id.name, start: node.start, end: node.end, loc: node.loc });
          }
        }
      }
    });

    if (!targets.length) continue;

    const advancedSafeTargets = [];
    for (const t of targets) {
      const name = t.name;
      let appears = false;
      for (const jf of jsFiles) {
        try {
          const jfContent = fs.readFileSync(jf, "utf8");
          const regex = new RegExp(`\\b${name}\\b`, "g");
          let match;
          while ((match = regex.exec(jfContent)) !== null) {
            const pos = match.index;
            if (jf === file && pos >= t.start && pos <= t.end) { regex.lastIndex = t.end; continue; }
            const before = jfContent.slice(Math.max(0, pos - 2), pos);
            const after = jfContent.slice(pos + name.length, pos + name.length + 2);
            const inString = /['"`]/.test(before) || /['"`]/.test(after);
            if (inString) {
              appears = true;
              break;
            }

            const propAccessRegex = new RegExp(`(\\.|\\[')${name}(['\\]]|\\b)`);
            if (propAccessRegex.test(jfContent.slice(Math.max(0, pos - 20), pos + name.length + 20))) {
              appears = true;
              break;
            }

            const callRegex = new RegExp(`\\b${name}\\s*\\(`);
            if (callRegex.test(jfContent)) {
              appears = true;
              break;
            }
          }
          if (appears) break;
        } catch (e) {}
      }
      if (!appears) advancedSafeTargets.push(t);
    }

    if (!advancedSafeTargets.length) continue;

    advancedSafeTargets.sort((a, b) => b.start - a.start);

    let modified = code;
    for (const t of advancedSafeTargets) {
      const snippet = modified.slice(t.start, t.end);
      const commented = snippet.split("\n").map(l => `// ${l}`).join("\n");
      const replacement = `/* DEADWATCHER REMOVED FUNCTION: ${t.name} - ${new Date().toISOString()} */\n// ORIGINAL (kept commented):\n${commented}\n`;
      if (patchOnly) {

        modified = modified.slice(0, t.start) + replacement + modified.slice(t.end);
      } else if (applyAll || options.applyAll) {
        const bak = backupFile(file);
        modified = modified.slice(0, t.start) + replacement + modified.slice(t.end);
        console.log(`  ✅ Comentada función ${t.name} en ${file} (backup: ${bak || "no disponible"})`);
      } else {
        console.log(`\n✂ Función detectada sin uso: ${t.name} en ${file} (líneas ${t.loc.start.line}-${t.loc.end.line})`);
        console.log(excerpt(code, t.start, t.end));
        const ans = await askQuestion(rl, `  ¿Comentar/Eliminar esta función? (y = comentar / n = mantener / a = comentar todas en este archivo): `);
        if (!ans) continue;
        if (ans.toLowerCase() === "n") continue;
        const bak = backupFile(file);
        modified = modified.slice(0, t.start) + replacement + modified.slice(t.end);
        console.log(`  ✅ Funcion comentada en ${file} (backup: ${bak || "no disponible"})`);
      }
    }

    if (modified !== code) {
      if (patchOnly) {
        if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir, { recursive: true });
        const patchText = simpleUnifiedDiff(code, modified, file);
        const patchPath = writePatchFile(nowTs(), file, patchText);
        console.log(`  📦 Patch JS creado: ${patchPath}`);
        changedFiles.add(patchPath);
      } else {
        fs.writeFileSync(file, modified, "utf8");
        changedFiles.add(file);
      }
    }
  }

  rl.close();
  return { changedFiles: Array.from(changedFiles) };
}

export async function interactiveFix(results, fileLists = {}, options = {}) {
  const cssFiles = fileLists.cssFiles || [];
  const jsFiles = fileLists.jsFiles || [];
  const applyAll = options.applyAll || false;
  const patchOnly = options.patchOnly || false;

  console.log("\n==================== DeadWatcher Fixer ====================");
  console.log(`Clases CSS no usadas: ${(results.unusedClasses || []).length}`);
  console.log(`Funciones JS sin uso: ${(results.jsUnused || []).length}`);
  console.log(`Backups automáticos a *.deadwatcher.bak.TIMESTAMP\n`);

  if (patchOnly) {
    const patches = await generatePatchesForResults(results, { cssFiles, jsFiles });
    console.log(`📦 Generados ${patches.length} parches en ./deadwatcher_patches (sin aplicar).`);
    return { changedFiles: patches };
  }

  const cssRes = await removeCssClassInteractive(results.unusedClasses || [], cssFiles, { applyAll, patchOnly });

  const jsRes = await removeJsFunctionsInteractive(results.jsUnused || [], jsFiles, { applyAll, patchOnly });

  const allChanged = [...cssRes.changedFiles, ...jsRes.changedFiles];
  if (allChanged.length) {
    console.log("\n✅ Archivos modificados:");
    allChanged.forEach(f => console.log(`  - ${f}`));
  } else {
    console.log("\nℹ No se modificó ningún archivo.");
  }

  return { changedFiles: allChanged };
}
