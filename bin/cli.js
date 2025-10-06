#!/usr/bin/env node
import { runWatcher } from "../src/index.js";
import { revertBackups } from "../src/reverter.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: deadwatcher [options]

Options:
  --once           Ejecuta el análisis una sola vez.
  --dashboard      Arranca el dashboard en http://localhost:3001
  --fix            Activa el fixer interactivo (pregunta antes de aplicar).
  --apply-all      Modo no interactivo: aplica todas las correcciones sin preguntar.
  --patch-only     No modifica archivos, genera .diff y suggested-changes.json en ./deadwatcher_patches
  --revert <TS>    Revertir backups con timestamp EXACTO o "all" para intentar revertir todo.
  --help, -h       Mostrar este mensaje.
`);
  process.exit(0);
}

const flags = args.filter(a => a.startsWith("--"));
const options = {
  once: flags.includes("--once"),
  dashboard: flags.includes("--dashboard"),
  fix: flags.includes("--fix"),
  applyAll: flags.includes("--apply-all"),
  patchOnly: flags.includes("--patch-only"),
};

if (flags.includes("--revert")) {
  const idx = args.indexOf("--revert");
  const ts = args[idx + 1];
  if (!ts) {
    console.error("Error: falta el TIMESTAMP para --revert. Usa --revert 1690000000000 o --revert all");
    process.exit(1);
  }

  revertBackups(ts).then(r => {
    console.log("Revert resultado:", r);
    process.exit(0);
  }).catch(e => {
    console.error("Error revert:", e);
    process.exit(2);
  });
} else {
  runWatcher(options);
}
