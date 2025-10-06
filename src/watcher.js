import chokidar from "chokidar";
import { analyze } from "./analyzer.js";
import { analyzeJS } from "./jsAnalyzer.js";
import { reportResults } from "./reporter.js";
import { updateDashboard } from "./dashboard.js";
import fs from "fs";
import path from "path";
import { deprecatedTagReplacements, getJSSuggestion } from "./suggestions.js";
import { interactiveFix, generatePatchesForResults } from "./fixer.js";

function getFilesRecursively(dir, exts, ignore = []) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });
  list.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (ignore.some(i => fullPath.includes(i))) return;
    if (file.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, exts, ignore));
    } else if (exts.includes(path.extname(file.name))) {
      results.push(fullPath);
    }
  });

  return results;
}

export function startWatcher({ once = false, fix = false, applyAll = false, patchOnly = false, dashboard = false } = {}) {
  const target = process.cwd();

  async function analyzeAndReport() {
    try {
      const htmlFiles = getFilesRecursively(target, [".html", ".ejs"], ["node_modules"]);
      const cssFiles = getFilesRecursively(target, [".css"], ["node_modules", "bootstrap"]);
      const jsFiles = getFilesRecursively(target, [".js"], ["node_modules"]);

      const cssHtmlResults = await analyze(htmlFiles, cssFiles, jsFiles);
      const jsResults = await analyzeJS(jsFiles);

      const jsErrorsWithSuggestions = jsResults.lintErrors.map(e => ({
        ...e,
        suggestion: getJSSuggestion(e.ruleId, e.message),
      }));

      const jsWarningsWithSuggestions = jsResults.lintWarnings.map(w => ({
        ...w,
        suggestion: getJSSuggestion(w.ruleId, w.message),
      }));

      const results = {
        ...cssHtmlResults,
        jsErrors: jsErrorsWithSuggestions,
        jsWarnings: jsWarningsWithSuggestions,
        jsUnused: jsResults.unusedFuncs,
        tagSuggestions: Object.fromEntries(cssHtmlResults.deprecatedTags.map(t => [t, deprecatedTagReplacements[t] || null])),
      };

      reportResults(results);
      updateDashboard(results);

      if (fix || applyAll || patchOnly) {
        if (patchOnly) {
          const patches = await generatePatchesForResults(results, { cssFiles, jsFiles });
          console.log(`📦 Generados ${patches.length} parches en ./deadwatcher_patches (sin aplicar).`);
        } else if (applyAll) {
          console.log("⚙ Modo apply-all: aplicando todas las correcciones sin preguntar...");
          await interactiveFix(results, { cssFiles, jsFiles, applyAll: true });
        } else {
          await interactiveFix(results, { cssFiles, jsFiles, applyAll: false });
        }
      }
    } catch (err) {
      console.warn("⚠️ Error durante el análisis:", err.message || err);
    }
  }

  if (once) {
    analyzeAndReport();
    return;
  }

  let debounceTimer = null;
  const scheduleAnalyze = (why, p) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`🔁 Ejecutando análisis (trigger: ${why}${p ? ` — ${p}` : ""})`);
      analyzeAndReport();
    }, 200);
  };

  const watcher = chokidar.watch(
    [
      `${target.replace(/\\/g, "/")}/**/*.html`,
      `${target.replace(/\\/g, "/")}/**/*.ejs`,
      `${target.replace(/\\/g, "/")}/**/*.css`,
      `${target.replace(/\\/g, "/")}/**/*.js`
    ],
    {
      ignored: /(node_modules|\.git|dist|build|coverage|logs)/,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
    }
  );

  watcher.on("ready", () => {
    console.log("👀 Vigilando cambios...");
    analyzeAndReport();
  });

  watcher.on("add", p => scheduleAnalyze("add", p));
  watcher.on("change", p => scheduleAnalyze("change", p));
  watcher.on("unlink", p => scheduleAnalyze("unlink", p));

  watcher.on("error", err => console.warn("Watcher error:", err));
}
