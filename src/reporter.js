import chalk from "chalk";
import { deprecatedTagReplacements, getJSSuggestion } from "./suggestions.js";

export function reportResults(results) {
  console.clear();
  console.log(chalk.green("✅ Análisis completado"));

  if (!results.unusedClasses?.length) {
    console.log(chalk.blue("No se encontraron clases CSS obsoletas."));
  } else {
    console.log(chalk.red("⚠ Clases no usadas detectadas:"));
    results.unusedClasses.forEach(c => console.log(`  ${chalk.yellow(c)}`));
  }

  if (!results.deprecatedTags?.length) {
    console.log(chalk.blue("No se encontraron etiquetas HTML obsoletas."));
  } else {
    console.log(chalk.red("⚠ Etiquetas HTML obsoletas detectadas:"));
    results.deprecatedTags.forEach(tag => {
      const fix = deprecatedTagReplacements[tag] || "No hay sugerencia disponible.";
      console.log(`  ${chalk.yellow(tag)} → ${chalk.cyan(fix)}`);
    });
  }

  if (!results.jsErrors?.length) {
    console.log(chalk.blue("No se encontraron errores de JS."));
  } else {
    console.log(chalk.red("⚠ Errores de JS detectados:"));
    results.jsErrors.forEach(err => {
      const fix = err.suggestion || getJSSuggestion(err.ruleId, err.message);
      console.log(
        `  ${chalk.yellow(err.file)}:${err.line} - ${chalk.red(err.message)} (${err.ruleId})`
      );
      console.log(`    👉 Sugerencia: ${chalk.cyan(fix)}`);
    });
  }

  if (!results.jsWarnings?.length) {
    console.log(chalk.blue("No se encontraron recomendaciones de JS."));
  } else {
    console.log(chalk.magenta("ℹ Cambios de JS recomendados:"));
    results.jsWarnings.forEach(warn => {
      const fix = warn.suggestion || getJSSuggestion(warn.ruleId, warn.message);
      console.log(
        `  ${chalk.yellow(warn.file)}:${warn.line} - ${chalk.cyan(warn.message)} (${warn.ruleId})`
      );
      console.log(`    👉 Reemplazo sugerido: ${chalk.cyan(fix)}`);
    });
  }

  if (!results.jsUnused?.length) {
    console.log(chalk.blue("No se encontraron funciones JS sin uso."));
  } else {
    console.log(chalk.red("⚠ Funciones JS sin uso detectadas:"));
    results.jsUnused.forEach(fn => {
      console.log(`  ${chalk.yellow(fn.name)} en ${fn.file}`);
    });
  }
}
