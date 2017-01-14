var library = require("module-library")(require)

module.exports = library.export(
  "render-checklist",
  ["./render-task", "web-element", "scroll-to-select", "bridge-module", "./dasherize", "basic-styles"],
  function(renderTask, element, scrollToSelect, bridgeModule, dasherize, basicStyles) {

    function renderChecklist(list, bridge) {

      var completeCount = 0
      var taskIds = []

      renderTask.prepareBridge(bridge)
      basicStyles.addTo(bridge)

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
      ])
      bridge.send(page)
    }

    return renderChecklist
  }
)