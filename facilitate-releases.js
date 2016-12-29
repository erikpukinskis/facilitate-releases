var library = require("module-library")(require)

library.define(
  "task-template",
  ["web-element", "make-it-checkable", "make-request"],
  function(element, makeItCheckable, makeRequest) {

    var happened

    var taskTemplate = element.template(
      ".task",
      element.style({
        "margin-bottom": "0.5em",
      }),
      function(bridge, listId, text, isComplete) {

        prepareBridge(bridge)

        this.addChild(text)

        makeItCheckable(
          this,
          bridge,
          happened.withArgs(listId, text),
          {checked: isComplete}
        )
      }
    )

    function prepareBridge(bridge) {
      if (bridge.__taskTemplateReady) {
        return
      }

      happened = bridge.defineFunction(
        [makeRequest.defineOn(bridge)], onTaskHappened
      )

      bridge.addToHead(makeItCheckable.stylesheet)

      bridge.addToHead(element.stylesheet(taskTemplate))

      bridge.__taskTemplateReady = true
    }

    function onTaskHappened(makeRequest, listId, text, checked) {
      var path = "/release-checklist/"+listId+"/happened/"+encodeURIComponent(text)

      makeRequest({method: "post", path: path, data: {isChecked: checked}})

      var countEl = document.querySelector(".complete-count")

      var count = parseInt(countEl.innerText)

      if (checked) {
        count++
      } else {
        count--
      }

      countEl.innerHTML = count
    }

    return taskTemplate
  }
)



library.define(
  "render-checklist",
  ["task-template", "web-element", "./bond-plugin"],
  function(taskTemplate, element, bondPlugin) {

    function renderChecklist(list, bridge) {

      var completeCount = 0

      var tasks = list.tasks.map(
        function(text, i) {
          var isComplete = list.tasksCompleted[i]||false
          if (isComplete) {
            completeCount++
          }
          return taskTemplate(bridge, list.id, text, isComplete)
        }
      )

      var headline = element("h1", [list.story+" (",
        element("span.complete-count", completeCount),
        "/"+tasks.length+")"
      ])

      var bondBridge = bridge.partial()
      var tagData = {}

      bondPlugin(list, bondBridge, registerTag)

      function registerTag(identifier, data) {
        tagData[identifier] = data
      }

      var page = element("form", {method: "post", action: "/release-checklist/"+list.id+"/tasks"}, [
        headline,
        tasks,
        element("p", "Enter items to check off:"),
        element("textarea", {name: "tasks"}),
        element("input", {type: "submit", value: "Add tasks"}),
        bondBridge,
      ])

      bridge.send(page)
    }

    return renderChecklist
  }
)


module.exports = library.export(
  "facilitate-releases",
  ["release-checklist", "web-element", "browser-bridge", "tell-the-universe", "basic-styles", "render-checklist"],
  function(releaseChecklist, element, BrowserBridge, tellTheUniverse, basicStyles, renderChecklist) {

    return function(site) {

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

      releaseChecklist("A 6x8 teensy house appears", "test")

      releaseChecklist.addTask("test", "Floor section built")

      // releaseChecklist.tag("test", "Floor section built", "base floor section")
      // releaseChecklist("Someone can build a house", "test")
      // releaseChecklist.addTask("test", "project facilitator can write down a release checklist")
      // releaseChecklist.addTask("4uwzyf", "planner can add a project plan as a dependency to a task")
      // releaseChecklist.addTask("4uwzyf", "planner writes bond")
      // releaseChecklist.addTask("4uwzyf", "planner adds labor allocations to bond")

      var storyForm = element("form", {method: "post", action: "/stories"}, [
        element("p", "Tell a story."),
        element("input", {type: "text", name: "story", placeholder: "Type what should happen"}),
        element("input", {type: "submit", value: "Make it so"}),
      ])

      var baseBridge = new BrowserBridge()

      baseBridge.addToHead(basicStyles)

      site.addRoute(
        "get",
        "/release-checklist",
        baseBridge.requestHandler(storyForm)
      )

      var storyBridge
      site.addRoute("post", "/stories", function(request, response) {

        var list = releaseChecklist(request.body.story)

        tellTheUniverse("releaseChecklist", list.story, list.id)

        bridge = storyBridge = baseBridge.forResponse(response)

        bridge.changePath("/release-checklist/"+list.id)

        renderChecklist(list, bridge)
      })

      site.addRoute("get", "/release-checklist/:id", function(request, response) {

        var list = releaseChecklist.get(request.params.id)

        if (!list) {
          throw new Error("No list "+request.params.id+" to show")
        }

        var bridge = baseBridge.forResponse(response)

        renderChecklist(list, bridge)
      })

      site.addRoute("post", "/release-checklist/:id/tasks", function(request, response) {
        var lines = request.body.tasks.split("\n")

        var id = request.params.id
        var list = releaseChecklist.get(id)

        if (!list) {
          throw new Error("No list "+id+"  to add tasks to")
        }

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
    }

  }
)

