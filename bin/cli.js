#!/usr/bin/env node
import { runWatcher } from "../src/index.js";

const args = process.argv.slice(2);

const flags = args.filter(a => a.startsWith("--"));
const options = {
  once: flags.includes("--once"),
  dashboard: flags.includes("--dashboard"),
};

runWatcher(options);
