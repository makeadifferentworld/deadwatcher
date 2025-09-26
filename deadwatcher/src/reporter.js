import chalk from "chalk";

export function reportResults(results) {
  console.clear();
  console.log(chalk.green("✅ Análisis completado"));
  if (results.unused.length === 0) {
    console.log(chalk.blue("No se encontraron clases CSS obsoletas."));
    return;
  }
  console.log(chalk.red("⚠ Clases no usadas detectadas:"));
  results.unused.forEach(u => {
    console.log(`  ${chalk.yellow(u.selector)} en ${chalk.gray(u.file)}`);
  });
}
