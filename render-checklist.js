var library = require("module-library")(require)

module.exports = library.export(
  "render-checklist",
  ["./render-task", "web-element", "scroll-to-select", "bridge-module", "./dasherize", "basic-styles"],
  function(renderTask, element, scrollToSelect, bridgeModule, dasherize, basicStyles) {


    function prepareBridge(bride) {

      renderTask.prepareBridge(bridge)
      basicStyles.addTo(bridge)

      if (bridge.remember("render-task/showTaskDetails")) { return }

      var showTaskDetails = bridge.defineFunction(function showTaskDetails(el) {
        document.getElementById(el.id+"-details").style.display = "block"
      })

      bridge.see("render-task/showTaskDetails", showTaskDetails)

      var hideTaskDetails = bridge.defineFunction(function hideTaskDetails(el) {
        document.getElementById(el.id+"-details").style.display = "none"
      })

      bridge.see("render-task/hideTaskDetails", hideTaskDetails)

      var scrollToSelect = bridgeModule(library, "scroll-to-select", bridge)

      bridge.see("scroll-to-select", scrollToSelect)

      console.log("saw scroll-to-select", scrollToSelect)

    }


    function renderChecklist(list, bridge) {

      var completeCount = 0
      var taskIds = []

      var scrollToSelect = bridge.remember("scroll-to-select")

      console.log("looking up scroll-to-select", scrollToSelect)

      bridge.asap(
        scrollToSelect.withArgs({
          ids: taskIds,
          onSelect: bridge.remember("render-task/showTaskDetails"),
          onUnselect: bridge.remember("render-task/hideTaskDetails"),
          text: "HIEEE"
        })
      )

      var tasks = list.tasks.map(
        function(text) {

          var taskId = dasherize(text)

          var isComplete = list.taskIsCompleted(text)||false

          var tags = list.tagsForTask(taskId)

          if (isComplete) {
            completeCount++
          }

          var taskEl = renderTask(bridge, list, text, tags, isComplete, taskId)

          taskIds.push(taskEl.id)

          return taskEl
        }
      )

      var headline = element(
        "h1",
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
        element("p", element("textarea", {name: "tasks"})),
        element("input", {type: "submit", value: "Add tasks"}),
      ])
      bridge.send(page)
    }

    renderChecklist.prepareBridge = prepareBridge

    return renderChecklist
  }
)