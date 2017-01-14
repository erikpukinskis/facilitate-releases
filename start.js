var library = require("module-library")(require)

library.using(
  ["./", "web-host", "with-nearby-modules", "release-checklist"],
  function(app, webHost, withNearbyModules, releaseChecklist) {

    var list = releaseChecklist.get("test")

    withNearbyModules
    .aModuleAppeared("release-checklist", function() {
      return list
    })

    webHost()
  }
)