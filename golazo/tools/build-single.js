// Empaqueta todo en un solo HTML sin archivos externos (CSS, Three.js, código y el JSON de la base de datos dentro).
// Uso: node tools/build-single.js            -> dist/golazo.html (documento completo: ábrelo o súbelo a cualquier hosting)
//      node tools/build-single.js <salida>   -> además escribe ahí el fragmento sin <html>/<head>/<body> (para publicarlo como artifact)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const esc = (s) => s.replace(/<\/script/gi, '<\\/script'), html = read('index.html');
JSON.parse(read('data/db.json')); // si el JSON editado a mano está roto, falla aquí y no en el teléfono
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
  '<script>' + esc(src === 'data/db.js' ? 'window.GOLAZO_SINGLE = 1; window.GOLAZO_DB = ' + read('data/db.json').trim() + ';' : read(src)) + '</script>');
if (/<script src=|<link /.test(body)) throw new Error('quedó una referencia externa');
const style = '<style>\n' + read('css/style.css') + '</style>\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'golazo.html'), html.slice(0, html.indexOf('<link rel="stylesheet"')) + style + '</head>\n<body>' + body + '</body>\n</html>\n');
if (process.argv[2]) fs.writeFileSync(process.argv[2], '<title>Golazo</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + style + body);
console.log('dist/golazo.html', (fs.statSync(path.join(root, 'dist', 'golazo.html')).size / 1024).toFixed(0) + ' KB');
