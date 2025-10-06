import { startWatcher } from "./watcher.js";
import { startDashboard } from "./dashboard.js";

export function runWatcher({
  once = false,
  dashboard = false,
  fix = false,
  applyAll = false,
  patchOnly = false,
} = {}) {
  console.log("🚀 DeadWatcher iniciado con opciones:", {
    once,
    dashboard,
    fix,
    applyAll,
    patchOnly,
  });

  startWatcher({ once, fix, applyAll, patchOnly, dashboard });

  if (dashboard) {
    startDashboard();
  }
}
