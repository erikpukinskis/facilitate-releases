var library = require("module-library")(require)


library.define(
  "task-template",
  ["web-element", "make-it-checkable", "make-request", "add-html", "./dasherize"],
  function(element, makeItCheckable, makeRequest, addHtml, dasherize) {

    var happened
    var showTags

    var tagTemplate = element.style(
      ".tag", 
      {
        "background": "#bfb6c5",
        "color": "white",
        "padding": "3px 6px 2px 5px",
        "display": "inline-block",
        "border-radius": "2px",
        "font-size": "0.76em",
        "text-transform": "uppercase",
        "vertical-align": "2px",
        "margin-left": "0.5em",
        "letter-spacing": "-0.08em",
        "font-weight": "bold",
        "box-shadow": "-3px 0px 0 #f2f1ff",
      }
    )

    var tagToggleTemplate = element.template(".toggle-button",
      function(bridge, tagText, listId, tagsSelector) {

        this.addChild(tagText)

        var toggleTag = bridge.__taskTemplateToggleTagBinding

        var tagId = dasherize(tagText)

        makeItCheckable(
          this,
          bridge,
          toggleTag.withArgs(listId, tagText, tagId, tagsSelector),
          {kind: "toggle-button"}
        )
      }
    )

    var taskTemplate = element.template(
      ".task",
      element.style({
        "padding": "8px",
        "display": "inline-block",
      }),
      function(bridge, list, text, isComplete, id) {

        var tagsEl = element("span.tags")
        tagsEl.assignId()

        this.addChild(text)
        this.addChild(tagsEl)

        makeItCheckable(
          this,
          bridge,
          bridge.__taskTemplateOnTaskHappenedBinding.withArgs(list.id, text),
          {checked: isComplete}
        )

        this.id = "list-"+list.id+"-task-"+id

        var tagToggles = list.tags.map(function(text) {
            return tagToggleTemplate(bridge, text, list.id, "#"+tagsEl.id)
          }
        )

        console.log(list.tags.length, "tags")

        var details = element(
          element.style({
            "display": "none"
          }),
          tagToggles
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
        [makeRequest.defineOn(bridge), addHtml.defineOn(bridge)], toggleTag)

      bridge.__taskTemplateOnTaskHappenedBinding = bridge.defineFunction(
        [makeRequest.defineOn(bridge)], onTaskHappened)

      bridge.addToHead(makeItCheckable.stylesheet)

      bridge.addToHead(element.stylesheet(taskTemplate))

      console.log("adding tag template!")
      bridge.addToHead(element.stylesheet(tagTemplate))

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

    function toggleTag(makeRequest, addHtml, listId, text, tagId, tagsSelector, isChecked) {

      try {
        var tagEl = document.querySelector(tagsSelector+" ."+tagId)
      } catch(e) {}

      if (tagEl && !isChecked) {
        tagEl.style.display = "none"
      } else if (tagEl && isChecked) {
        tagEl.style.display = "inline-block"
      } else if (!tagEl && isChecked) {
        addHtml.inside(tagsSelector, "<div class=\"tag "+tagId+"\">"+text+"</div>")
      }

      makeRequest({
        method: "post",
        path: "/release-checklist/"+listId+"/tags/"+encodeURIComponent(tagId),
        data: {isTagged: true},
      })

      console.log("tag", tagId, "is checked:", isChecked)
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
        "/release-checklist/:listId/tags/:tagId",
        function(request, response) {
          if (request.body.isTagged) {
            console.log("list", request.params.listId, "add tag", request.params.tagId)
            // tellTheUniverse("releaseChecklist.addTag", ...)
          } else {
            console.log("list", request.params.listId, "remove tag", request.params.tagId)
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

