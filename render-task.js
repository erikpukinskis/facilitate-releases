var library = require("module-library")(require)

module.exports = library.export(
  "render-task",
  ["web-element", "make-it-checkable", "make-request", "add-html", "./dasherize"],
  function(element, makeItCheckable, makeRequest, addHtml, dasherize) {

    var happened
    var showTags

    var renderTag = element.template(
      ".tag", 
      element.style({
        "background": "#444",
        "color": "white",
        "padding": "2px 8px 2px 7px",
        "display": "inline-block",
        "border-radius": "0.25em",
        "font-size": "0.76em",
        "text-transform": "uppercase",
        "vertical-align": "2px",
        "margin-left": "0.5em",
        "letter-spacing": "-0.08em",
        "font-weight": "bold",
        "line-height": "1em",
        "white-space": "nowrap",
      }),
      function(text) {
        this.classes.push("tag-"+dasherize(text))
        this.addChild(text)
      }
    )

    var checkedTag = element.style(
      ".is-checked .tag", {"background": "#bbb"})

    var renderTask = element.template(
      ".task",
      element.style({
        // "padding": "8px",
        "display": "inline-block",
        "width": "100%",
        "line-height": "1.3em",
        "margin-bottom": "0.5em",
      }),
      function(bridge, list, taskText, tags, isComplete, taskId) {

        if (taskId.match(/ /)) {
          throw new Error("space in task id!")
        }
        var tagsSelector = ".tags-for-"+taskId

        var tagsEl = element("span.tags"+tagsSelector, tags.map(renderTag))

        this.addChild(taskText)
        this.addChild(tagsEl)

        makeItCheckable(
          this,
          bridge,
          bridge.remember("render-task/onTaskHappened").withArgs(list.taskId, taskText),
          {checked: isComplete}
        )

        this.id = "list-"+list.id+"-task-"+taskId

        var onToggle = bridge.remember("render-task/toggleTag")

        onToggle.withArgs(list.id, taskText, tagsSelector)

        var tagToggles = list.tags.map(
          function(tagText) {

            var isTagged = list.hasTag(taskText, tagText)

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

    function prepareBridge(bridge) {
      console.log ("is render prepped?")

      if (bridge.remember("render-task/toggleTag")) { return console.log("YA")}

      var binding = bridge.defineFunction(
        [makeRequest.defineOn(bridge), addHtml.defineOn(bridge)], toggleTag)

      bridge.see("render-task/toggleTag", binding)

      binding = bridge.defineFunction(
        [makeRequest.defineOn(bridge)], onTaskHappened)

      bridge.see("render-task/onTaskHappened", binding)

      bridge.addToHead(makeItCheckable.stylesheet)

      bridge.addToHead(element.stylesheet(renderTask))

      bridge.addToHead(element.stylesheet(renderTag, checkedTag))
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

    function toggleTag(makeRequest, addHtml, listId, taskText, tagsSelector, tagText, tagId, isChecked) {

      try {
        var tagEl = document.querySelector(tagsSelector+" .tag-"+tagId)
      } catch(e) {}

      if (tagEl && !isChecked) {
        tagEl.style.display = "none"
      } else if (tagEl && isChecked) {
        tagEl.style.display = "inline-block"
      } else if (!tagEl && isChecked) {
        addHtml.inside(tagsSelector, "<div class=\"tag tag-"+tagId+"\">"+tagText+"</div>")
      }

      makeRequest({
        method: "post",
        path: "/release-checklist/"+listId+"/tasks/"+encodeURIComponent(taskText)+"/tags/"+encodeURIComponent(tagText),
        data: {shouldBeTagged: isChecked},
      })
    }


    renderTask.prepareBridge = prepareBridge

    return renderTask
  }
)

