var http = require("http"), url = require("url"), fs = require("fs");

http.createServer(function (request, response) {
  var query = url.parse(request.url); 
  if (/^\/?$/.exec(query.pathname)) {
  } else {
    if (query.pathname == "/save") {
    } else if (/^\/(?:src|web)/.exec(query.pathname)) {
      fs.readFile(query.pathname.substring(1), "utf8", function (error, data) {
        if (error) throw error;

        function mimeType () {
          switch (/\.([^.]+)$/.exec(query.pathname)[1]) {
          case "css":
            return "text/css";
          }
          return "text/html";
        }

        response.writeHead(200, {"Content-Type": mimeType() });
        response.end(data);
      });
    }
  }
}).listen(8080);

console.log("Server running at http://127.0.0.1:8080/");
// vim: set ts=2 sw=2 nowrap:
