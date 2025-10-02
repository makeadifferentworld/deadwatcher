import fs from "fs";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";
import * as cheerio from "cheerio";

/**
 * Analiza clases CSS no usadas y etiquetas HTML obsoletas
 * @param {string[]} htmlFiles - Archivos HTML/EJS
 * @param {string[]} cssFiles - Archivos CSS
 * @param {string[]} jsFiles - Archivos JS
 */
export async function analyze(htmlFiles, cssFiles, jsFiles = []) {
  const usedClasses = new Set();
  const definedClasses = new Set();

  const deprecatedTags = [
    "acronym", "applet", "basefont", "big", "blink", "center", "font", "marquee",
    "s", "strike", "tt", "u", "frame", "frameset", "noframes", "isindex", "keygen",
    "listing", "xmp", "plaintext", "bgsound", "dir"
  ];
  const foundDeprecatedTags = new Set();

  htmlFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, "utf8");
      const $ = cheerio.load(content);

      $("[class]").each((_, el) =>
        $(el)
          .attr("class")
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => usedClasses.add(c))
      );

      deprecatedTags.forEach(tag => {
        if ($(tag).length > 0) foundDeprecatedTags.add(tag);
      });
    } catch (err) {
      console.warn(`Warning leyendo HTML ${file}: ${err.message}`);
    }
  });

  cssFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, "utf8");
      const root = postcss().process(content, { parser: safeParser }).root;

      root.walkRules(rule => {
        rule.selectors.forEach(sel => {
          const matches = sel.match(/\.[A-Za-z0-9\-_]+/g);
          if (matches) matches.forEach(c => definedClasses.add(c.slice(1)));
        });
      });
    } catch (err) {
      console.warn(`⚠️ Error analizando CSS ${file}: ${err.reason || err.message}`);
    }
  });

  const ignoredPatterns = [
    // Bootstrap 5
    "container", "container-fluid", "row", "col", "col-*", "d-*", "flex-*", "justify-*", "align-*",
    "btn", "btn-*", "btn-outline-*", "btn-group", "btn-group-*", "card", "card-*", "alert", "alert-*",
    "modal", "modal-*", "fade", "show", "collapse", "collapsed", "dropdown", "dropdown-*", "tooltip",
    "popover", "nav", "nav-*", "navbar", "navbar-*", "form-control", "form-select", "form-check", "form-check-*",
    "active", "disabled", "visually-hidden", "text-*", "bg-*", "border", "border-*",

    // DataTables
    "dataTable", "dataTables_*", "paginate_button", "dataTables_wrapper", "sorting", "sorting_*",
    "sorting_asc", "sorting_desc", "sorting_disabled", "odd", "even", "row_selected", "highlight",

    // Font Awesome
    "fa", "fa-*", "fas", "far", "fal", "fab", "fa-lg", "fa-2x", "fa-3x", "fa-4x", "fa-5x",

    // Animate.css
    "animate__animated", "animate__fadeIn", "animate__fadeOut", "animate__bounce", "animate__flash",
    "animate__headShake", "animate__heartBeat", "animate__hinge", "animate__jello", "animate__pulse",
    "animate__rubberBand", "animate__shakeX", "animate__shakeY", "animate__slideInUp", "animate__slideOutDown",
    "animate__zoomIn", "animate__zoomOut",
  ];

  function isIgnoredClass(c) {
    if (!c) return false;
    for (const p of ignoredPatterns) {
      if (p.includes("*")) {
        const parts = p.split("*").map(s => s.trim());
        if (parts.length === 1 && parts[0] === "") return true;
        let lastIndex = -1;
        let ok = true;
        for (const part of parts) {
          if (!part) continue;
          const found = c.indexOf(part, lastIndex + 1);
          if (found === -1) {
            ok = false;
            break;
          }
          lastIndex = found + part.length - 1;
        }
        if (ok) return true;
      } else {
        if (p === c) return true;
      }
    }
    return false;
  }

  jsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, "utf8");

      const htmlClassPattern = /class\s*=\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = htmlClassPattern.exec(content)) !== null) {
        match[1]
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => usedClasses.add(c));
      }

      const jqClassPattern = /(?:\.addClass|\.removeClass|\.toggleClass)\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((match = jqClassPattern.exec(content)) !== null) {
        match[1]
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => usedClasses.add(c));
      }

      const classListPattern = /classList\.(?:add|remove|toggle)\(\s*([^)]+)\)/g;
      while ((match = classListPattern.exec(content)) !== null) {
        match[1]
          .replace(/['"`]/g, "")
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => usedClasses.add(c));
      }

      const setAttrPattern = /setAttribute\(\s*['"`]class(?:Name)?['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((match = setAttrPattern.exec(content)) !== null) {
        match[1]
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => usedClasses.add(c));
      }

      const concatPattern = /(?:['"`]\s*([A-Za-z0-9\-_ ]+)\s*['"`]\s*)(?:\+\s*[A-Za-z0-9_]+)+|(?:[A-Za-z0-9_]+\s*\+\s*['"`]\s*([A-Za-z0-9\-_ ]+)\s*['"`])/g;

      while ((match = concatPattern.exec(content)) !== null) {
        const classes = match[1] || match[2];
        if (classes) {
          classes.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c));
        }
      }

      const templatePattern = /`([^`$]+)\$\{[^}]+\}([^`]*)`/g;

      while ((match = templatePattern.exec(content)) !== null) {
        const before = match[1].trim();
        const after = match[2].trim();
        if (before) before.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c));
        if (after) after.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c));
      }

      const templateTernaryPattern = /\$\{\s*[^?}]+\?\s*['"`]([^'"`]+)['"`]\s*:\s*['"`]?([^'"`}]+)?['"`]?\s*\}/g;

      while ((match = templateTernaryPattern.exec(content)) !== null) {
        const trueBranch = match[1]?.trim();
        const falseBranch = match[2]?.trim();
        if (trueBranch) trueBranch.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c));
        if (falseBranch) falseBranch.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c));
      }

      const templateExprPattern = /\$\{([^}]+)\}/g;

      function extractClassesFromExpression(expr) {
        const results = [];

        if (expr.includes("?") && expr.includes(":")) {
          const ternaryRegex = /([^?]+)\?\s*([^:]+)\s*:\s*(.+)/;
          const ternaryMatch = expr.match(ternaryRegex);
          if (ternaryMatch) {
            const trueBranch = ternaryMatch[2].trim();
            const falseBranch = ternaryMatch[3].trim();

            results.push(...extractClassesFromExpression(trueBranch));
            results.push(...extractClassesFromExpression(falseBranch));
          }
        } else {
          const stringLiteralRegex = /['"`]([^'"`]+)['"`]/g;
          let m;
          while ((m = stringLiteralRegex.exec(expr)) !== null) {
            m[1].split(/\s+/).filter(Boolean).forEach(c => results.push(c));
          }
        }

        return results;
      }

      while ((match = templateExprPattern.exec(content)) !== null) {
        const expr = match[1].trim();
        const classes = extractClassesFromExpression(expr);
        classes.forEach(c => usedClasses.add(c));
      }

    } catch (err) {
      console.warn(`Lectura fallida: ${err.message}`);
    }
  });

  const unusedClasses = Array.from(definedClasses).filter(
    c => !usedClasses.has(c) && !isIgnoredClass(c)
  );

  return {
    unusedClasses,
    deprecatedTags: Array.from(foundDeprecatedTags),
  };
}
