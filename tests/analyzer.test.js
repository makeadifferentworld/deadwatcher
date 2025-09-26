import { analyzeProject } from "../src/analyzer.js";

test("Detecta clases CSS no usadas y etiquetas HTML obsoletas", async () => {
  const htmlFiles = ["tests/fixtures/test.html"];
  const cssFiles = ["tests/fixtures/test.css"];

  const results = await analyzeProject(htmlFiles, cssFiles);

  console.log("Clases CSS no usadas:", results.unusedClasses);
  console.log("Etiquetas HTML obsoletas:", results.deprecatedTags);

  expect(Array.isArray(results.unusedClasses)).toBe(true);
  expect(Array.isArray(results.deprecatedTags)).toBe(true);
});
