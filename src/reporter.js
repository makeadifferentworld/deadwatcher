import chalk from "chalk";

export function reportResults(results) {
  console.clear();
  console.log(chalk.green("✅ Análisis completado"));

  if (!results.unusedClasses || results.unusedClasses.length === 0) {
    console.log(chalk.blue("No se encontraron clases CSS obsoletas."));
  } else {
    console.log(chalk.red("⚠ Clases no usadas detectadas:"));
    results.unusedClasses.forEach(c => {
      console.log(`  ${chalk.yellow(c)}`);
    });
  }

  if (!results.deprecatedTags || results.deprecatedTags.length === 0) {
    console.log(chalk.blue("No se encontraron etiquetas HTML obsoletas."));
  } else {
    console.log(chalk.red("⚠ Etiquetas HTML obsoletas detectadas:"));
    results.deprecatedTags.forEach(tag => {
      console.log(`  ${chalk.yellow(tag)}`);
    });
  }
}
