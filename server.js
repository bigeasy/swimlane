var http = require("http"), url = require("url"), fs = require("fs");

var mount = "/swimlane/alpha";

http.createServer(function (request, response) {
  var query = url.parse(request.url); 
  if (query.pathname.indexOf(mount) == 0) {
    var pathname = query.pathname.substring(mount.length);
    console.log(pathname);
    if (/^\/?$/.exec(pathname)) {
    } else {
      if (pathname == "/save") {
      } else if (/^\/(?:src|web)/.exec(pathname)) {
        fs.readFile(pathname.substring(1), function (error, data) {
          if (error) throw error;

          function mimeType () {
            switch (/\.([^.]+)$/.exec(pathname)[1]) {
            case "css":
              return "text/css";
            case "png":
              return "image/png";
            }
            return "text/html";
          }

          response.writeHead(200, {"Content-Type": mimeType() });
          response.end(data);
        });
      }
    }
  }
}).listen(8080);

console.log("Server running at http://127.0.0.1:8080/");
// vim: set ts=2 sw=2 nowrap:
