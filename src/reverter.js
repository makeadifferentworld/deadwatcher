import fs from "fs";
import path from "path";

export async function revertBackups(ts) {
  const cwd = process.cwd();
  const files = listAllFiles(cwd);
  const bakFiles = files.filter(f => f.includes(".deadwatcher.bak."));
  if (!bakFiles.length) return { ok: false, message: "No se encontraron backups" };

  if (ts === "all") {
    const restored = [];
    for (const b of bakFiles) {
      const orig = b.replace(/\.deadwatcher\.bak\.\d+$/, "");
      try {
        fs.copyFileSync(b, orig);
        restored.push({ backup: b, restoredTo: orig });
      } catch (e) {
      }
    }
    return { ok: true, restored };
  }

  const matched = bakFiles.filter(b => b.endsWith(`.deadwatcher.bak.${ts}`));
  if (!matched.length) return { ok: false, message: `No se encontró backup con timestamp ${ts}` };

  const restored = [];
  for (const b of matched) {
    const orig = b.replace(/\.deadwatcher\.bak\.\d+$/, "");
    try {
      fs.copyFileSync(b, orig);
      restored.push({ backup: b, restoredTo: orig });
    } catch (e) {
    }
  }

  return { ok: true, restored };
}

function listAllFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      results = results.concat(listAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}
