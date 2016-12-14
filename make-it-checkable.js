var library = require("module-library")(require)

module.exports = library.export(
  "make-it-checkable",
  ["web-element", "function-call"],
  function(element, functionCall) {

    function makeItCheckable(el, bridge, handler, options) {

      var isChecked = options.checked || false

      el.children.unshift(checkBox())

      var id = el.assignId()

      if (isChecked) {
        el.classes.push("is-checked")
      }

      el.classes.push("checkable-"+id)

      el.onclick(checkOffOnBridge(bridge).withArgs(functionCall.raw("event"), id, handler).evalable())
    }

    function checkOffOnBridge(bridge) {
      var checkOff = bridge.__makeItCheckableCheckOffBinding

      if (!checkOff) {
        checkOff = bridge.__makeItCheckableCheckOffBinding = bridge.defineFunction(function checkOff(event, id, callback) {
          event.preventDefault()
          var el = document.querySelector(".checkable-"+id)

          var isCompleted = el.classList.contains("is-checked")

          if (isCompleted) { return }

          el.classList.add("is-checked")

          callback(id)
        })
      }

      return checkOff
    }      

    var checkMark = element.template(
      ".check-mark",
      element.style({
        "visibility": "hidden"
      }),
      "✗"
    )

    var checkMarkVisible = element.style(".is-checked .check-mark", {
      "visibility": "visible",
      "color": "#888",
    })

    var checkBox = element.template(
      ".toggle-button",
      element.style({
        "border": "2px solid #888",
        // "vertical-align": "-0.15em",
        "background": "transparent",
        "width": "1.15em",
        "height": "1.15em",
        "margin-right": "0.5em",
        "padding": "1px 3px 0px 3px",
        "font-size": "1.15em",
        "line-height": "1em",
        "display": "inline-block",
        "cursor": "pointer",
        "box-sizing": "border-box",
      }),
      checkMark()
    )

    var checkableChecked = element.template(
      ".is-checked",
      element.style({
        "text-decoration": "line-through"
      })
    )

    makeItCheckable.stylesheet = element.stylesheet(checkMark, checkMarkVisible, checkBox, checkableChecked)

    return makeItCheckable
  }
)
