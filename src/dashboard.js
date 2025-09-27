import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import open from "open";

let lastResults = { unusedClasses: [], deprecatedTags: [] };

export function startDashboard() {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, "../public");

  app.use(express.static(publicPath));

  app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "dashboard.html"));
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
