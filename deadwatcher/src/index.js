import { startWatcher } from "./watcher.js";
import { startDashboard } from "./dashboard.js";

export function runWatcher({ once = false, dashboard = false }) {
  console.log("🚀 DeadWatcher iniciado...");
  startWatcher({ once });

  if (dashboard) {
    startDashboard();
  }
}
