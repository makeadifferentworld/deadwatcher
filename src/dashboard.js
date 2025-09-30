import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import open from "open";

let lastResults = { unusedClasses: [], deprecatedTags: [] };

export function startDashboard() {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicPath = resolve(__dirname, "..", "public");

  app.use(express.static(publicPath));

  app.get("/", (req, res) => {
    res.sendFile("dashboard.html", { root: publicPath });
  });

  app.get("/data", (req, res) => {
    res.json(lastResults);
  });

  const port = 3001;
  app.listen(port, () => {
    console.log(`📊 Dashboard disponible en http://localhost:${port}`);
    open(`http://localhost:${port}`);
  });
}

export function updateDashboard(results) {
  lastResults = results;
}
