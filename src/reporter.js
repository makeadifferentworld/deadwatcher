import chalk from "chalk";

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
    results.deprecatedTags.forEach(tag => console.log(`  ${chalk.yellow(tag)}`));
  }

  if (!results.jsErrors?.length) {
    console.log(chalk.blue("No se encontraron errores de JS."));
  } else {
    console.log(chalk.red("⚠ Errores de JS detectados:"));
    results.jsErrors.forEach(err => {
      console.log(
        `  ${chalk.yellow(err.file)}:${err.line} - ${chalk.red(err.message)} (${err.ruleId})`
      );
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
