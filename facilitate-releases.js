var library = require("module-library")(require)


library.define(
  "task-template",
  ["web-element", "make-it-checkable", "make-request"],
  function(element, makeItCheckable, makeRequest) {

    var happened
    var showTags

    var taskTemplate = element.template(
      ".task",
      element.style({
        "padding": "8px",
        "display": "inline-block",
      }),
      function(bridge, list, text, isComplete, id) {

        this.addChild(text)

        makeItCheckable(
          this,
          bridge,
          bridge.__taskTemplateOnTaskHappenedBinding.withArgs(list.id, text),
          {checked: isComplete}
        )

        this.id = "list-"+list.id+"-task-"+id

        var tagTemplate = element.template(".tag.toggle-button",
          function(identifier) {
            this.addChild(identifier)
            makeItCheckable(this, bridge, bridge.__taskTemplateToggleTagBinding.withArgs(list.id, identifier), {kind: "toggle-button"})
          }
        )

        var tags = list.tags.map(tagTemplate)

        console.log(list.tags.length, "tags")

        var details = element(
          element.style({
            "display": "none"
          }),
          tags
        )

        details.id = this.id+"-details"
        this.addChild(details)
      }
    )

    function prepareBridge(bridge) {
      if (bridge.__taskTemplateReady) {
        return
      }

      bridge.__taskTemplateToggleTagBinding = bridge.defineFunction(
        [makeRequest.defineOn(bridge)],
        function(makeRequest, listId, identifier, isChecked) {

          makeRequest({
            method: "post",
            path: "/release-checklist/"+listId+"/tags/"+encodeURIComponent(identifier),
            data: {isTagged: true},
          })

          console.log("tag", identifier, "is checked:", isChecked)
        }
      )

      bridge.__taskTemplateOnTaskHappenedBinding = bridge.defineFunction(
        [makeRequest.defineOn(bridge)], function onTaskHappened(makeRequest, listId, text, checked) {
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
      })

      bridge.addToHead(makeItCheckable.stylesheet)

      bridge.addToHead(element.stylesheet(taskTemplate))

      bridge.__taskTemplateReady = true
    }

    taskTemplate.prepareBridge = prepareBridge

    return taskTemplate
  }
)



library.define(
  "render-checklist",
  ["task-template", "web-element", "./bond-plugin", "scroll-to-select", "bridge-module"],
  function(taskTemplate, element, bondPlugin, scrollToSelect, bridgeModule) {

    function renderChecklist(list, bridge) {


      // Bond

      var bondBridge = bridge.partial()

      bondPlugin(list, bondBridge)


      // Tasks

      var completeCount = 0
      var taskIds = []

      taskTemplate.prepareBridge(bridge)

      var tasks = list.tasks.map(
        function(text, i) {
          var isComplete = list.tasksCompleted[i]||false
          if (isComplete) {
            completeCount++
          }
          var taskEl = taskTemplate(bridge, list, text, isComplete, i)

          taskIds.push(taskEl.id)

          return taskEl
        }
      )

      var showTaskDetails = bridge.defineFunction(function showTaskDetails(el) {
        document.getElementById(el.id+"-details").style.display = "block"
      })

      var hideTaskDetails = bridge.defineFunction(function hideTaskDetails(el) {
        document.getElementById(el.id+"-details").style.display = "none"
      })

      bridge.asap(
        bridgeModule(library, "scroll-to-select", bridge)
        .withArgs({
          ids: taskIds,
          onSelect: showTaskDetails,
          onUnselect: hideTaskDetails,
          text: "HIEEE"
        })
      )

      var headline = element(
        "h1",
        element.style({"margin-top": "200px"}), 
        [
          list.story+" (",
          element("span.complete-count", completeCount),
          "/"+tasks.length+")"
        ]
      )

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

      baseBridge.requestHandler(storyForm)

      site.addRoute(
        "get",
        "/release-checklist",
        baseBridge.requestHandler(storyForm)
      )

      site.addRoute(
        "post",
        "/release-checklist/:listId/tags/:tagIdentifier",
        function(request, response) {
          if (request.body.isTagged) {
            console.log("list", request.params.listId, "add tag", request.params.tagIdentifier)
            // tellTheUniverse("releaseChecklist.addTag", ...)
          } else {
            console.log("list", request.params.listId, "remove tag", request.params.tagIdentifier)
            // tellTheUniverse("releaseChecklist.removeTag", ...)
          }
          response.send({ok: true})
        }
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

