import chokidar from "chokidar";
import { analyzeProject } from "./analyzer.js";
import { reportResults } from "./reporter.js";

export function startWatcher({ once = false }) {
  const files = ["./**/*.html", "./**/*.ejs", "./**/*.css", "./**/*.js"];

  if (once) {
    analyzeAndReport();
    return;
  }

  const watcher = chokidar.watch(files, { ignored: /node_modules/ });
  watcher.on("ready", () => console.log("👀 Vigilando cambios..."));
  watcher.on("change", analyzeAndReport);
  watcher.on("add", analyzeAndReport);
}

async function analyzeAndReport() {
  const results = await analyzeProject();
  reportResults(results);
}
