var connect = require("connect");

console.log(process.argv);
var app = connect()
  .use(connect.logger())
  .use(connect.static(process.argv[2]))
  .listen(8386);
