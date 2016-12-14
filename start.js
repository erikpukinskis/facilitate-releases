var library = require("module-library")(require)

library.using(
  ["./", "web-site"],
  function(facilitateReleases, WebSite) {
    WebSite.provision(facilitateReleases)
    WebSite.megaBoot()
  }
)
