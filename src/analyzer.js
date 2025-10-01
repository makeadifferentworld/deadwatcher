import fs from "fs";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";
import * as cheerio from "cheerio";

/**
 * Analiza clases CSS no usadas y etiquetas HTML obsoletas
 * @param {string[]} htmlFiles - Archivos HTML/EJS
 * @param {string[]} cssFiles - Archivos CSS
 */
export async function analyze(htmlFiles, cssFiles) {
  const usedClasses = new Set();
  const definedClasses = new Set();
  const deprecatedTags = [
    "acronym", "applet", "basefont", "big", "blink", "center", "font", "marquee",
    "s", "strike", "tt", "u", "frame", "frameset", "noframes", "isindex", "keygen",
    "listing", "xmp", "plaintext", "bgsound", "dir"
  ];
  const foundDeprecatedTags = new Set();

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    const $ = cheerio.load(content);

    $("[class]").each((_, el) =>
      $(el)
        .attr("class")
        .split(/\s+/)
        .forEach(c => usedClasses.add(c))
    );

    deprecatedTags.forEach(tag => {
      if ($(tag).length > 0) foundDeprecatedTags.add(tag);
    });
  });

  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    try {
      const root = postcss().process(content, { parser: safeParser }).root;

      root.walkRules(rule => {
        rule.selectors.forEach(sel => {
          const matches = sel.match(/\.[\w-]+/g);
          if (matches) matches.forEach(c => definedClasses.add(c.slice(1)));
        });
      });
    } catch (err) {
      console.warn(`⚠️ Error analizando ${file}: ${err.reason || err.message}`);
    }
  });

  const unusedClasses = Array.from(definedClasses).filter(
    c => !usedClasses.has(c)
  );

  return {
    unusedClasses,
    deprecatedTags: Array.from(foundDeprecatedTags),
  };
}
