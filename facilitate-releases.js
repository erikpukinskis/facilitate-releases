var library = require("module-library")(require)


library.define(
  "task-template",
  ["web-element", "make-it-checkable", "make-request", "add-html", "./dasherize"],
  function(element, makeItCheckable, makeRequest, addHtml, dasherize) {

    var happened
    var showTags

    var tagTemplate = element.template(
      ".tag", 
      element.style({
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
      }),
      function(text) {
        this.addChild(text)
      }
    )

    var tagToggleTemplate = element.template(".toggle-button",
      function(bridge, onToggle, tagText, tagId, isTagged) {

        this.addChild(tagText)

        var tagId = dasherize(tagText)

        makeItCheckable(
          this,
          bridge,
          onToggle.withArgs(tagText, tagId),
          {kind: "toggle-button"}
        )

        if (isTagged) {
          this.addSelector(".is-checked")
        }
      }
    )

    var taskTemplate = element.template(
      ".task",
      element.style({
        "padding": "8px",
        "display": "inline-block",
      }),
      function(bridge, list, taskText, tags, isComplete, taskId) {

        if (tags[0] && tags[0].match(/-/)) {
          throw new Error("tag text has a dash!")
        }

        console.log(""+tags.length+" tags")
        var tagsEl = element("span.tags", tags.map(tagTemplate))

        tagsEl.assignId()

        this.addChild(taskText)
        this.addChild(tagsEl)

        makeItCheckable(
          this,
          bridge,
          bridge.__taskTemplateOnTaskHappenedBinding.withArgs(list.taskId, taskText),
          {checked: isComplete}
        )

        this.id = "list-"+list.id+"-task-"+taskId

        var tagsSelector = "#"+tagsEl.id

        var onToggle = bridge.__taskTemplateToggleTagBinding.withArgs(list.id, taskId, tagsSelector)


        var tagToggles = list.tags.map(
          function(tagText) {

            var isTagged = list.hasTag(taskText, tagText)
            console.log("is", taskText, "tagged", tagText, "?", JSON.stringify(isTagged))

            var tagId = dasherize(tagText)

            var el = tagToggleTemplate(bridge, onToggle, tagText, tagId, isTagged)

            return el
          }
        )

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

    function toggleTag(makeRequest, addHtml, listId, taskId, tagsSelector, tagText, tagId, isChecked) {

      try {
        var tagEl = document.querySelector(tagsSelector+" ."+tagId)
      } catch(e) {}

      if (tagEl && !isChecked) {
        tagEl.style.display = "none"
      } else if (tagEl && isChecked) {
        tagEl.style.display = "inline-block"
      } else if (!tagEl && isChecked) {
        addHtml.inside(tagsSelector, "<div class=\"tag "+tagId+"\">"+tagText+"</div>")
      }

      makeRequest({
        method: "post",
        path: "/release-checklist/"+listId+"/tasks/"+taskId+"/tags/"+encodeURIComponent(tagText),
        data: {shouldBeTagged: true},
      })
    }


    taskTemplate.prepareBridge = prepareBridge

    return taskTemplate
  }
)



library.define(
  "render-checklist",
  ["task-template", "web-element", "./bond-plugin", "scroll-to-select", "bridge-module", "dasherize"],
  function(taskTemplate, element, bondPlugin, scrollToSelect, bridgeModule, dasherize) {

    function renderChecklist(list, bridge) {


      // Bond

      var bondBridge = bridge.partial()

      bondPlugin(list, bondBridge)


      // Tasks

      var completeCount = 0
      var taskIds = []

      taskTemplate.prepareBridge(bridge)

      var tasks = list.tasks.map(
        function(text) {
          var taskId = dasherize(text)

          var isComplete = list.taskIsCompleted(text)||false

          var tags = list.tagsForTask(taskId)

          if (isComplete) {
            completeCount++
          }

          var taskEl = taskTemplate(bridge, list, text, tags, isComplete, taskId)

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

      releaseChecklist.tag("test", "floor section built", "base floor section")
      
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

      "/release-checklist/test/tasks/0/tags/base-floor-section"
      "/release-checklist/:listId/tasks/:task-id/tags/:tagId"


      site.addRoute(
        "post",
        "/release-checklist/:listId/tasks/:taskId/tags/:tagText",
        function(request, response) {
          var list = releaseChecklist.get(request.params.listId)
          var tagText = request.params.tagText
          var shouldBeTagged = request.body.shouldBeTagged
          var task = request.params.taskId
          var hasTag = list.hasTag(task, tagText)
          var taskId = request.params.taskId

          if (shouldBeTagged && !hasTag) {
            releaseChecklist.tag(list, taskId, tagText)
            tellTheUniverse("releaseChecklist.tag", list.id, taskId, tagText)
          } else if (hasTag && !shouldBeTagged) {
            releaseChecklist.untag(list, taskId, tagId)
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

