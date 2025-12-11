/**
 * Простейший пример приложения Warog.
 * Для упрощения используется встроенный http сервер Node.js.
 */
const http = require('http');

const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Hello Warog</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello Warog</h1>
      <p>Это демонстрационное приложение, сгенерированное для релиза v1.0.0.</p>
    </div>
  </body>
</html>`;

const server = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Hello Warog доступен по адресу http://localhost:${PORT}`);
});
