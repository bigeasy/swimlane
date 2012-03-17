{Twinkie}       = require "./vendor/twinkie/lib/twinkie"

twinkie = new Twinkie
twinkie.source  /(\.swp|~)$/, "src"
twinkie.mkdir   "lib", "public/javascripts", "public/stylesheets"
twinkie.coffee  "src/lib",            "lib"
twinkie.coffee  "vendor/reactor/lib",            "lib"
twinkie.coffee  "src/javascripts",    "public/javascripts"
twinkie.ejs     "src/javascripts",    "public/javascripts"
twinkie.less    "src/stylesheets",    "public/stylesheets"
twinkie.less    "src/stylesheets",    "public/stylesheets"
twinkie.copy    "vendor/jquery-simulate", "public/javascripts", /\.js$/, /\.min\.js$/
twinkie.copy    "vendor/qunit/qunit", "public/stylesheets", /\.css$/
twinkie.copy    "vendor/qunit/qunit", "public/javascripts", /\.js$/
twinkie.copy    "src/javascripts",    "public/javascripts", /\.js$/
twinkie.copy    "src/qunit",          "public/qunit",       /\.js$/
twinkie.copy    "src/html",           "public",             /\.html$/
twinkie.copy    "src/lib",            "lib",                /\.js$/
twinkie.copy    "src/stylesheets",    "public/stylesheets", /\.(?:css:png)$/
twinkie.copy    "src/lib",            "lib",                /\.js$/
twinkie.tasks task, "compile", "watch", "gitignore"
