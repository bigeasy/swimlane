var http = require("http"), url = require("url"), fs = require("fs");

http.createServer(function (request, response) {
  var query = url.parse(request.url); 
  if (query.pathname.indexOf("/favicon.ico") == -1) {
    var pathname = query.pathname
    console.log(pathname);
    if (/^\/?$/.exec(pathname)) {
    } else {
      if (pathname == "/save") {
      } else if (/^\/(?:lib|src|web|vendor)/.exec(pathname)) {
        fs.readFile("/public" + pathname, function (error, data) {
          if (error) throw error;

          function mimeType () {
            switch (/\.([^.]+)$/.exec(pathname)[1]) {
            case "css":
              return "text/css";
            case "js":
              return "text/javascript";
            case "png":
              return "image/png";
            }
            return "text/html; charset=utf8";
          }

          response.writeHead(200, { "Content-Type": mimeType(), "Content-Length": data.length });
          response.end(data);
        });
      }
    }
  } else {
    response.writeHead(404);
    response.end();
  }
}).listen(8386);

console.log("Server running at http://127.0.0.1:8386/");
// vim: set ts=2 sw=2 nowrap:
