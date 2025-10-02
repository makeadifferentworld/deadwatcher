export const deprecatedTagReplacements = {
    acronym: "Usar <abbr> en su lugar.",
    applet: "Usar <object> o <embed>.",
    basefont: "Usar CSS para estilos tipográficos.",
    big: "Usar CSS con font-size mayor.",
    blink: "Usar animaciones CSS (no recomendado para accesibilidad).",
    center: "Usar CSS con text-align: center.",
    font: "Usar CSS para definir familia y tamaño de fuente.",
    marquee: "Usar CSS animations o <div> con overflow + scroll.",
    s: "Usar <del> o CSS text-decoration: line-through.",
    strike: "Usar <del> o CSS text-decoration: line-through.",
    tt: "Usar CSS con font-family: monospace.",
    u: "Usar CSS text-decoration: underline.",
    frame: "Usar <iframe> (el soporte de frames fue eliminado).",
    frameset: "Usar <iframe> con diseño moderno.",
    noframes: "Usar <iframe> o rediseñar el layout.",
    isindex: "Usar <form> con <input>.",
    keygen: "Usar <form> + Web Crypto API.",
    listing: "Usar <pre>.",
    xmp: "Usar <pre> o <code>.",
    plaintext: "Usar <pre> o <code>.",
    bgsound: "Usar <audio autoplay> con controles si corresponde.",
    dir: "Usar <ul>.",
  };
  
  export const jsRuleFixes = {
    "no-undef": "Definir la variable antes de usarla, importarla correctamente o corregir el nombre.",
    "no-unused-vars": "Eliminar la variable si no se usa, renombrarla o comentar el uso si es intencional.",
    "no-var": "Reemplazar 'var' por 'let' o 'const' según corresponda (scoping más seguro).",
    "prefer-const": "Usa `const` para variables que no son reasignadas.",
  
    eqeqeq: "Usar '===' o '!==' en lugar de '==' o '!=' para evitar coerción implícita.",
  
    "no-with": "Eliminar el uso de 'with'; no está permitido en ES strict.",
    "no-new-object": "Usa la notación literal `{}` en lugar de `new Object()`.",
    "prefer-arrow-callback": "Usar funciones flecha en callbacks cuando no se necesite `this`: `() => {}`.",
    "func-names": "Nombrar funciones anónimas para facilitar debugging.",
    "no-dupe-keys": "Eliminar o renombrar claves duplicadas en objetos literales.",
    "no-dupe-args": "No declarar dos veces el mismo argumento en una función; renombrar o eliminar.",
    "no-redeclare": "No redeclarar la misma variable en el mismo scope; usar let/const o agrupar lógica.",
    "duplicate-function": "Renombrar o eliminar la función duplicada; evitar declarar la misma función dos veces en un mismo archivo.",
  
    "parse-error": "Error de sintaxis: revisar paréntesis, llaves, comas o puntos y comas faltantes. Intente abrir el archivo en el editor para ver el highlight.",
    "lint-error": "Error de lint general: revisar el mensaje y ejecutar ESLint en el archivo para más detalles.",
    "no-extra-semi": "Eliminar los punto y coma extra innecesarios.",
    "no-unexpected-multiline": "Revisar saltos de línea que cambien el comportamiento (ej: `return` en línea separada del valor).",
    "no-empty": "Evitar bloques vacíos; si es intencional, documentar con un comentario `// intentional`.",
    "no-duplicate-case": "Eliminar casos duplicados dentro de un switch.",
    "no-unreachable": "Quitar código después de `return`, `throw`, `continue` o `break` que no se ejecuta.",
    "no-constant-condition": "Evitar condiciones que siempre son true/false; si es intencional, dejar un comentario.",
    "no-extra-parens": "Quitar paréntesis adicionales; ayudan a evitar confusión y problemas de orden de operaciones.",
  
    "missing-parenthesis": "Cerrar los paréntesis `()` que falten.",
    "missing-bracket": "Cerrar los corchetes `[]` que falten.",
    "missing-brace": "Cerrar las llaves `{}` que falten.",
  
    "curly": "Usar siempre llaves `{}` en bloques `if`/`else`/`for` para evitar ambigüedades.",
    "brace-style": "Asegurar el estilo de llaves consistente para mejorar legibilidad.",
    "quotes": "Usar comillas consistentes según la convención del proyecto (simples o dobles).",
  
    "default": "Revisar documentación de ESLint para la regla indicada o ejecutar `eslint --fix` si aplica.",
  };
  
  export const parseMessageFixes = [
    {
      pattern: /Unexpected token/i,
      suggestion:
        "Revisar comas, paréntesis o llaves mal colocadas. Ejemplo: eliminar una coma extra en un objeto/array o cerrar una llave/paréntesis faltante.",
    },
    {
      pattern: /has already been declared/i,
      suggestion:
        "Hay una declaración duplicada. Eliminar la declaración repetida o renombrar la variable/función para evitar el conflicto.",
    },
    {
      pattern: /Identifier '[^']+' has already been declared/i,
      suggestion:
        "Identificador duplicado: renombrar o eliminar una de las declaraciones (por ejemplo `let x` y luego `const x`).",
    },
    {
      pattern: /Unexpected string/i,
      suggestion:
        "Posible comillas mal cerradas o falta de operador entre cadenas; revisar cadenas (`'...'` o \"...\") y operadores.",
    },
    {
      pattern: /Unexpected number/i,
      suggestion:
        "Probablemente falta un operador entre valores (ej: `2 3`), o hay un número colocado donde no corresponde.",
    },
    {
      pattern: /Unexpected identifier/i,
      suggestion:
        "Posible palabra reservada usada como variable, o falta un separador/coma; revisar la línea indicada.",
    },
    {
      pattern: /Parsing error: EOF/i,
      suggestion:
        "El archivo terminó de forma inesperada — probablemente falta una llave `}` o paréntesis `)` al final.",
    },
    {
      pattern: /.*/i,
      suggestion:
        "Error de parsing: revisar sintaxis (paréntesis, comas, llaves). Abrir el archivo en el editor para ver el highlight.",
    },
  ];
  
  export function getJSSuggestion(ruleId, message) {
    if (ruleId && jsRuleFixes[ruleId]) return jsRuleFixes[ruleId];
  
    const msg = (message || "").toString();
    if (msg) {
      for (const p of parseMessageFixes) {
        if (p.pattern.test(msg)) return p.suggestion;
      }
    }
  
    if (!ruleId) return jsRuleFixes["parse-error"] || parseMessageFixes[parseMessageFixes.length - 1].suggestion;
  
    return jsRuleFixes["default"] || "Revisar documentación de ESLint.";
  }