import { analyzeProject } from "../src/analyzer.js";

test("Detecta clases obsoletas", async () => {
  const results = await analyzeProject();
  expect(results).toHaveProperty("unused");
  expect(Array.isArray(results.unused)).toBe(true);
});
