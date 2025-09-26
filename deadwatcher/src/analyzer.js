import fs from "fs";
import path from "path";
import postcss from "postcss";
import cheerio from "cheerio";

export async function analyzeProject() {
  const cssFiles = getFiles("./", ".css");
  const htmlFiles = getFiles("./", ".html").concat(getFiles("./", ".ejs"));

  let usedClasses = new Set();

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    const $ = cheerio.load(content);
    $("[class]").each((_, el) => {
      $(el).attr("class").split(/\s+/).forEach(c => usedClasses.add(c));
    });
  });

  let unused = [];
  cssFiles.forEach(file => {
    const css = fs.readFileSync(file, "utf8");
    postcss.parse(css).walkRules(rule => {
      rule.selectors.forEach(sel => {
        if (sel.startsWith(".")) {
          const cls = sel.slice(1);
          if (!usedClasses.has(cls)) {
            unused.push({ file, selector: sel });
          }
        }
      });
    });
  });

  return { unused, used: [...usedClasses] };
}

function getFiles(dir, ext) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(getFiles(full, ext));
    } else if (f.endsWith(ext)) {
      files.push(full);
    }
  });
  return files;
}
