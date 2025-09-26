#!/usr/bin/env node
import { runWatcher } from "../src/index.js";

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
  🔍 DeadWatcher - Vigila tu proyecto en tiempo real

  Uso:
    deadwatcher [options]

  Opciones:
    --help          Muestra esta ayuda
    --once          Analiza una sola vez y termina
    --dashboard     Levanta un dashboard en http://localhost:3001
  `);
  process.exit(0);
}

runWatcher({ once: args.includes("--once"), dashboard: args.includes("--dashboard") });
