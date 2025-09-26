import express from "express";

let lastResults = {};

export function startDashboard() {
  const app = express();
  app.use(express.static("public"));

  app.get("/data", (req, res) => res.json(lastResults));

  app.listen(3001, () => {
    console.log("📊 Dashboard en http://localhost:3001");
  });
}

export function updateDashboard(results) {
  lastResults = results;
}
