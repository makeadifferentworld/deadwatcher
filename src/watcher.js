import chokidar from "chokidar";
import { analyze } from "./analyzer.js";
import { analyzeJS } from "./jsAnalyzer.js";
import { reportResults } from "./reporter.js";
import { updateDashboard } from "./dashboard.js";
import fs from "fs";
import path from "path";

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

export function startWatcher({ once = false }) {
  const target = process.cwd();
  const htmlFiles = getFilesRecursively(target, [".html", ".ejs"], ["node_modules"]);
  const cssFiles = getFilesRecursively(target, [".css"], ["node_modules", "bootstrap"]);
  const jsFiles = getFilesRecursively(target, [".js"], ["node_modules"]);

  async function analyzeAndReport() {
    try {
      const cssHtmlResults = await analyze(htmlFiles, cssFiles);
      const jsResults = await analyzeJS(jsFiles);

      const results = {
        ...cssHtmlResults,
        jsErrors: jsResults.lintErrors,
        jsWarnings: jsResults.lintWarnings,
        jsUnused: jsResults.unusedFuncs
      };      

      reportResults(results);
      updateDashboard(results);
    } catch (err) {
      console.warn("⚠️ Error durante el análisis:", err.message);
    }
  }

  if (once) {
    analyzeAndReport();
    return;
  }

  const watcher = chokidar.watch(
    ["./src/**/*.html", "./src/**/*.ejs", "./src/**/*.css", "./src/**/*.js"],
    {
      ignored: /(node_modules|\.git|dist|build|coverage|logs)/,
      ignoreInitial: true
    }
  );  

  watcher.on("ready", () => {
    console.log("👀 Vigilando cambios...");
    analyzeAndReport();
  });

  watcher.on("change", analyzeAndReport);
  watcher.on("add", analyzeAndReport);
}
