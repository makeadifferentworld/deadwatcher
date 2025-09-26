import fs from "fs";
import postcss from "postcss";
import * as cheerio from "cheerio";

/**
 * Analiza clases CSS no usadas y etiquetas HTML obsoletas
 * @param {string[]} htmlFiles - Archivos HTML/EJS
 * @param {string[]} cssFiles - Archivos CSS
 */
export async function analyze(htmlFiles, cssFiles) {
  const usedClasses = new Set();
  const definedClasses = new Set();
  const deprecatedTags = ["strike", "font", "center", "u", "big", "tt"];
  const foundDeprecatedTags = new Set();

  // Analizar HTML
  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    const $ = cheerio.load(content);

    // Clases usadas
    $("[class]").each((_, el) =>
      $(el)
        .attr("class")
        .split(/\s+/)
        .forEach(c => usedClasses.add(c))
    );

    // Etiquetas obsoletas
    deprecatedTags.forEach(tag => {
      if ($(tag).length > 0) foundDeprecatedTags.add(tag);
    });
  });

  // Analizar CSS
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    const root = postcss.parse(content);

    root.walkRules(rule => {
      rule.selectors.forEach(sel => {
        const matches = sel.match(/\.[\w-]+/g);
        if (matches) matches.forEach(c => definedClasses.add(c.slice(1)));
      });
    });
  });

  // Clases definidas en CSS pero no usadas
  const unusedClasses = Array.from(definedClasses).filter(
    c => !usedClasses.has(c)
  );

  return {
    unusedClasses,
    deprecatedTags: Array.from(foundDeprecatedTags),
  };
}
