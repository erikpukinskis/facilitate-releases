var library = require("module-library")(require)

module.exports = library.export(
  "facilitate-releases",
  ["release-checklist", "web-element", "browser-bridge", "tell-the-universe", "basic-styles", "./make-it-checkable", "make-request"],
  function(releaseChecklist, element, BrowserBridge, tellTheUniverse, basicStyles, makeItCheckable, makeRequest) {

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

      releaseChecklist("Someone can build a house", "4uwzyf")

      releaseChecklist.addTask("4uwzyf", "project facilitator can write down a release checklist")
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

      function renderChecklist(list, bridge) {

        var happened = bridge.defineFunction(
          [makeRequest.defineOn(bridge)],
          function happened(makeRequest, listId, text, checked) {
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
        ).withArgs(list.id)


        var taskTemplate = element.template(
          ".task",
          element.style({
            "margin-bottom": "0.5em",
          }),
          function(listId, text, isComplete) {
            this.addChild(text)

            var onChecked = happened.withArgs(text)

            makeItCheckable(this, bridge, onChecked, {checked: isComplete})
          }
        )

        bridge.addToHead(makeItCheckable.stylesheet)
        bridge.addToHead(element.stylesheet(taskTemplate))

        var completeCount = 0

        var tasks = list.tasks.map(
          function(text, i) {
            var isComplete = list.tasksCompleted[i]||false
            if (isComplete) {
              completeCount++
            }
            return taskTemplate(list.id, text, isComplete)
          }
        )

        var headline = element("h1", [list.story+" (",
          element("span.complete-count", completeCount),
          "/"+tasks.length+")"
        ])

        var form = element("form", {method: "post", action: "/release-checklist/"+list.id+"/tasks"}, [
          headline,
          tasks,
          element("p", "Enter items to check off:"),
          element("textarea", {name: "tasks"}),
          element("input", {type: "submit", value: "Add tasks"}),
        ])

        bridge.send(form)
      }

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


// Release Checklist for selling a house

// project facilitator can write down a release checklist

// planner can add a project plan as a dependency to a task

// planner writes bond

// planner adds labor allocations to bond

// planner adds material allocations to bond

// reader can clock in

// investor reads a bind

// investor buys bond

// reader can clock out

// buyer receives bond purchase order

// buyer files receipt, [takes cash]

// buyer files materials receipts

// investor can monitor books

// investor can track progress

// investor can monitor payout status

// builder can register for work

// builder receives shifts

// worker clocks in and out

// builder receives task assignments

// worker can check tasks off

// buyer receives pay notification, [pays worker]

// sales receives production notification

// tester checks off release checklist

// homeowner buys house

// homeowner refers sales person

// homeowner provides delivery address

// buyer files receipt, [takes cash from homeowner]

// buyer files receipt for sales commission, [pays sales]

// truck driver receives delivery request

// buyer files receipt for gas, [pays driver]

// homeowner and driver file delivery notification

// buyer files delivery receipt, [pays driver]

// investor receives bond maturity notification

// investor requests share sale

// buyer files share sale receipt, [pays investor]

// programmer is assigned release task

// programmer marks task implemented

// worker flag themselves as stuck




