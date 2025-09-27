#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { analyze } from "../src/analyzer.js";

const args = process.argv.slice(2);

// separar flags y paths
const flags = args.filter(a => a.startsWith("--"));
const target = args.find(a => !a.startsWith("--")) || process.cwd();

function getFilesRecursively(dir, exts, ignore = []) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });

  list.forEach(file => {
    const fullPath = path.join(dir, file.name);

    // ignorar node_modules y bootstrap
    if (ignore.some(i => fullPath.includes(i))) return;

    if (file.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, exts, ignore));
    } else if (exts.includes(path.extname(file.name))) {
      results.push(fullPath);
    }
  });

  return results;
}

async function runAnalysis() {
  console.log(`🔍 Analizando: ${target}`);

  const htmlFiles = getFilesRecursively(target, [".html", ".ejs"], ["node_modules"]);
  const cssFiles = getFilesRecursively(target, [".css"], ["node_modules", "bootstrap"]);

  if (htmlFiles.length === 0 && cssFiles.length === 0) {
    console.warn("⚠️ No se encontraron archivos HTML/EJS o CSS.");
    return;
  }

  const results = await analyze(htmlFiles, cssFiles);

  console.log("Clases CSS no usadas:", results.unusedClasses);
  console.log("Etiquetas HTML obsoletas:", results.deprecatedTags);
}

// manejar flags
if (flags.includes("--once")) {
  runAnalysis();
} else if (flags.includes("--dashboard")) {
  console.log("🚀 Dashboard aún no implementado (WIP)");
  runAnalysis();
} else {
  runAnalysis();
}
