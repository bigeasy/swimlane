fs              = require("fs")
{exec, spawn}   = require("child_process")
path            = require("path")

# Get the current git branch.
currentBranch = (callback) ->
  branches = ""
  git = spawn "git", [ "branch" ], { customFds: [ 0, -1, 2 ] }
  git.stdout.on "data", (buffer) -> branches += buffer.toString()
  git.on "exit", (status) ->
    process.exit 1 if status != 0
    branch = /\*\s+(.*)/.exec(branches)[1]
    callback branch

# Cheap `make`. Why not use real `make`? Because real make solves a more
# complicated problem, building an artifact that has multiple dependencies,
# which in turn have dependencies. Here we build artifacts that each have a
# single dependency; a JavaScript file build from a CoffeeScript file.
coffeeSearch = (from, to, commands) ->
  # Gather up the CoffeeScript files and directories in the source directory.
  files = []
  dirs = []
  try
    for file in fs.readdirSync from
      if match = /^(.*).coffee$/.exec(file)
        file = match[1]
        source = "#{from}/#{file}.coffee"
        try
          try
            stat = fs.statSync("#{to}/#{file}.js")
           catch e
            throw e if e.number != process.binding("net").ENOENT
            try
              stat = fs.statSync("#{to}/#{file}")
            catch e
              throw e if e.number != process.binding("net").ENOENT
          if not stat or fs.statSync(source).mtime > stat.mtime
            files.push source
        catch e
          throw e if e.number != process.binding("net").ENOENT
          files.push source
      else
        try
          stat = fs.statSync "#{from}/#{file}"
          if stat.isDirectory()
            dirs.push file
        catch e
          console.log "Gee Wilikers."
  catch e
    throw e if e.number != process.binding("net").ENOENT

  # Create the destination directory if it does not exist.
  if files.length
    try
      fs.statSync to
    catch e
      fs.mkdirSync to, parseInt(755, 8)
    commands.push [ "coffee", "-c -o #{to}".split(/\s/).concat(files) ]

  for dir in dirs
    coffeeSearch "#{from}/#{dir}",  "#{to}/#{dir}", commands

copySearch = (from, to, include, exclude, commands) ->
  if not commands? and (exclude instanceof Array)
    commands = exclude
    exclude = null
  # Gather up the CoffeeScript files and directories in the source directory.
  files = []
  dirs = []
  for file in fs.readdirSync from
    source = "#{from}/#{file}"
    if include.test(source) and not (exclude and exclude.test(source))
      try
        if fs.statSync(source).mtime > fs.statSync("#{to}/#{file}").mtime
          files.push source
      catch e
        files.push source
    else
      try
        stat = fs.statSync "#{from}/#{file}"
        if stat.isDirectory() and file isnt ".git"
          dirs.push file # Create the destination directory if it does not exist.
      catch e
        console.warn "Cannot stat: #{from}/#{file}"
        throw e if e.number != process.binding("net").ENOENT
        console.warn "File disappeared: #{from}/#{file}"
  if files.length
    try
      fs.statSync to
    catch e
      fs.mkdirSync to, parseInt(755, 8)
    commands.push [ "cp", files.concat(to) ]

  for dir in dirs
    copySearch "#{from}/#{dir}",  "#{to}/#{dir}", include, exclude, commands

shebang = (shebang, files...) ->
  for file in files
    try
      program = file.replace /^(.*)\/(.*?)\..*$/, "$1/$2"
      contents = "#{shebang}\n#{fs.readFileSync file, "utf8"}"
      fs.writeFileSync program, contents, "utf8"
      fs.chmodSync program, 0755
      fs.unlinkSync file
    catch e
      throw e if e.number != process.binding("net").ENOENT
      continue

task "gitignore", "create a .gitignore for node-ec2 based on git branch", ->
  currentBranch (branch) ->
    gitignore = '''
                .gitignore
                lib-cov
                .DS_Store
                lib/*
                bin/*
                **/.DS_Store
                
                '''

    if branch is "gh-pages"
      gitignore += '''
                   lib/*
                   '''
    else if branch is "master"
      gitignore += '''
                   documentation
                   site
                   index.html
                   lib/*
                   '''
    fs.writeFile(".gitignore", gitignore)

# Generate Node IDL documentation.
task "index", "rebuild the Node IDL landing page.", ->
  idl       = require("idl")
  package   = JSON.parse fs.readFileSync "package.json", "utf8"
  idl.generate "#{package.name}.idl", "index.html"

# Generate Docco documentation.
task "docco", "rebuild the CoffeeScript docco documentation.", ->
  exec "rm -rf documentation && docco src/*.coffee && cp -rf docs documentation && rm -r docs", (err) ->
    throw err if err

# Compile CoffeeScript sources.
task "compile", "compile the CoffeeScript into JavaScript", ->
  compile ->

compile = (callback) ->
  commands = []
  coffeeSearch "src/lib", "lib", commands
  coffeeSearch "src/bin", "bin", commands
  coffeeSearch "src/javascripts", "public/javascripts", commands
  copySearch "vendor/jquery/dist", "public/javascripts", /\.js$/, /\.min\.js$/, commands
  copySearch "vendor/jquery-simulate", "public/javascripts", /\.js$/, commands
  index = 0
  next = (callback) ->
    if commands.length is 0
      callback()
    else
      command = commands.shift()
      command.push { customFds: [ 0, 1, 2 ] }
      less = spawn.apply null, command
      less.on "exit", (code) ->
        process.exit(code) unless code is 0
        next(callback)
  next ->
    shebang "#!/usr/bin/env node", "bin/ec2.js"
    callback() if callback?

# Run Expresso test coverage.
task "coverage", "run coverage", ->
  expresso = spawn "expresso", [ "coverage.js", "--coverage" ], { customFds: [ 0, 1, 2 ] }
  expresso.on "exit", (status) -> process.exit(1) if status != 0

# Run tests.
task "test", "run tests", ->
  env = {}
  for key, value of process.env
    env[key] = value
  env.NODE_PATH = "./lib"
  exec "vows vows/*.js  --spec", { env }, (error, stdout, stderr) ->
    throw error if error
    process.stdout.write(stdout)
    process.stdout.write(stderr)

# Clean output files.
task "clean", "rebuild the CoffeeScript docco documentation.", ->
  currentBranch (branch) ->
    if branch is "master"
      rm = spawn "/bin/rm", "-rf site documentation lib/packet.js lib/pattern.js".split(/\s+/), { customFds: [ 0, 1, 2 ] }
      rm.on "exit", (code) ->
        process.exit code if code

sourceSearch = (update, exclude, splat...) ->
  [ dirs, files, sources ] = [ [], [], [] ]
  for dir in splat
    try
      for file in fs.readdirSync dir
        try
          full = "#{dir}/#{file}"
          stat = fs.statSync(full)
          if stat.isDirectory()
            dirs.push full
          else if not exclude.test(full)
            files.push full
        catch e
          console.warn "Cannot stat: #{from}/#{file}"
          throw e if e.number != process.binding("net").ENOENT
          console.warn "File disappeared: #{from}/#{file}"
    catch e
      throw e if e.number != process.binding("net").ENOENT
  for file in files
    fs.watchFile file, update
  if dirs.length
    sourceSearch.apply null, [ update, exclude ].concat(dirs)

server = null
process.on "exit", -> server.kill() if server

task "watch", "watch for changes, compile and restart server", ->
  status = invoke "compile"
  restart = ->
    server = spawn "node", [ "server.js" ], { customFds: [ 0, 1, 2 ] }
    server.on "exit", (code) ->
      server = null
      compile ->
        restart()
        process.stderr.write "\u0007### RESTARTED #{new Array(70).join("#")}\n"
  compile ->
    restart()
    update = (current, previous) ->
      if current.mtime.getTime() != previous.mtime.getTime()
        process.stderr.write "#{current.mtime} != #{previous.mtime} inode #{current.ino} #{previous.ino}\n"
        server.kill()
    sourceSearch update, /(\.swp|~)$/, "src", "queries", "eco"
