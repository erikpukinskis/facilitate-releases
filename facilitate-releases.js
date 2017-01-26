var library = require("module-library")(require)

module.exports = library.export(
  "facilitate-releases",
  ["release-checklist", "web-element", "browser-bridge", "tell-the-universe", "./render-checklist", "with-nearby-modules"],
  function(releaseChecklist, element, BrowserBridge, tellTheUniverse, renderChecklist, withNearbyModules) {


    tellTheUniverse = tellTheUniverse
      .called("project-process")
      .withNames({
        releaseChecklist: "release-checklist",
        workSpace: "work-space",
      })

    if (process.env.AWS_ACCESS_KEY_ID) {
      tellTheUniverse.persistToS3({
        key: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: "ezjs"
      })

      tellTheUniverse.loadFromS3(function(){
        console.log("OK! "+releaseChecklist.count+" lists")
      })
    }
    
    function prepareSite(site) {

      if (site.remember("facilitate-releases")) {
        return
      }

      // var storyForm = element("form", {method: "post", action: "/stories"}, [
      //   element("p", "Tell a story."),
      //   element("input", {type: "text", name: "story", placeholder: "Type what should happen"}),
      //   element("input", {type: "submit", value: "Make it so"}),
      // ])


      // baseBridge.requestHandler(storyForm)

      // site.addRoute(
      //   "get",
      //   "/release-checklist",
      //   baseBridge.requestHandler(storyForm)
      // )

      var baseBridge = new BrowserBridge()
      
      site.addRoute(
        "post",
        "/release-checklist/:listId/tasks/:taskText/tags/:tagText",
        function(request, response) {
          var list = releaseChecklist.get(request.params.listId)
          var tagText = request.params.tagText
          var shouldBeTagged = request.body.shouldBeTagged
          var taskText = request.params.taskText
          var hasTag = list.hasTag(taskText, tagText)

          var taskId = request.params.taskId

          if (shouldBeTagged && !hasTag) {
            releaseChecklist.tag(list, taskText, tagText)
            tellTheUniverse("releaseChecklist.tag", list.id, taskText, tagText)
          } else if (hasTag && !shouldBeTagged) {
            releaseChecklist.untag(list, taskText, tagText)
            tellTheUniverse("  releaseChecklist.untag", list.id, taskText, tagText)
          }
          response.send({ok: true})
        }
      )

      site.addRoute("post", "/stories", function(request, response) {

        var list = releaseChecklist(request.body.story)

        tellTheUniverse("releaseChecklist", list.story, list.id)

        bridge = baseBridge.forResponse(response)

        bridge.changePath("/release-checklist/"+list.id)

        renderChecklist(list, bridge)
      })

      site.addRoute("post", "/release-checklist/:id/tasks", function(request, response) {
        var lines = request.body.tasks.split("\n")

        var id = request.params.id
        var list = releaseChecklist.get(id)

        lines.forEach(function(line) {
          var text = line.trim()

          if (text.length < 1) { return }

          releaseChecklist.addTask(list, text)

          tellTheUniverse("releaseChecklist.addTask", id, text)
        })

        var bridge = baseBridge.forResponse(response)

        bridge.changePath("/release-checklist/"+list.id)

        renderChecklist(list, bridge)
      })

      // site.addRoute(
      //   "get", "/buy",
      //   buy(materials)
      // )

      site.addRoute("post", "/release-checklist/:id/happened/:text", function(request, response) {

        var id = request.params.id
        var text = request.params.text
        var isChecked = request.body.isChecked

        if (isChecked) {
          releaseChecklist.checkOff(id, text)
          tellTheUniverse("releaseChecklist.checkOff", id, text)
        } else {
          releaseChecklist.uncheck(id, text)
          tellTheUniverse("releaseChecklist.uncheck", id, text)
        }

        response.send({status: "ok"})
      })

      site.see("facilitate-releases", true)
    }

    renderChecklist.prepareSite = prepareSite
    
    return renderChecklist
  }
)

