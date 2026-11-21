// node construir.js [salida.html]: junta todo en un solo archivo (para publicarlo o pasarlo al teléfono).
const fs = require('fs'), path = require('path');
const leer = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = leer('index.html');
const cabeza = html.match(/<title>[\s\S]*<\/style>/)[0];
const cuerpo = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script src="(.+?)"><\/script>/g, (_, f) => `<script>\n${leer(f)}</script>`);
fs.writeFileSync(process.argv[2] || path.join(__dirname, 'calle-mayor.html'), cabeza + cuerpo);
