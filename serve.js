const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const ROOT = process.env.ROOT ? path.resolve(process.env.ROOT) : __dirname;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url || "/");
    const reqPath = decodeURIComponent(parsedUrl.pathname || "/");

    // Map `/` to `/index.html`
    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(ROOT, safePath === "/" ? "/index.html" : safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(filePath));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(e instanceof Error ? e.message : "Server error");
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Toolbox test server listening on http://localhost:${PORT}`);
});

