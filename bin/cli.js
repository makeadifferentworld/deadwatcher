#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { analyze } from "../src/analyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dir, extList, files = []) {
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, extList, files);
    } else if (extList.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  // 🎯 Leer argumento del usuario o usar `.` por defecto
  const targetDir = process.argv[2] || process.cwd();

  console.log(`🔍 Analizando: ${targetDir}`);

  const htmlFiles = getAllFiles(targetDir, [".html", ".ejs"]);
  const cssFiles = getAllFiles(targetDir, [".css"]);

  if (htmlFiles.length === 0 && cssFiles.length === 0) {
    console.log("⚠️ No se encontraron archivos HTML/EJS o CSS.");
    return;
  }

  const results = await analyze(htmlFiles, cssFiles);

  console.log("Clases CSS no usadas:", results.unusedClasses);
  console.log("Etiquetas HTML obsoletas:", results.deprecatedTags);
}

main();
