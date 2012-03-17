connect       = require "connect"

exports.server = connect.createServer(
  connect.logger(),
  connect.static("#{__dirname}/../public")
)
