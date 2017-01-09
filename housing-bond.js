var library = require("module-library")(require)

module.exports = library.export(
  "bond-plugin",
  ["house-plan", "house-panels", "./allocate-materials", "./invoice-materials", "web-element"],
  function(HousePlan, housePanels, allocateMaterials, invoiceMaterials, element) {
    var HOURLY = 2000
    var HOUSE_PER_SECTION = 8

    function register(list) {
      if (list.__bondPlugingRegisteredTags) { return }

      housePanels.forEach(function(options) {
        list.registerTag(options.tag)
      })

      list.__bondPlugingRegisteredTags = true
    }

    return function(list, bridge) {

      register(list)

      var plan = new HousePlan()
      var hours = 0

      housePanels.forEach(function(options) {
        var tag = options.tag
        var generator = options.generator

        if (!options.tag) {
          console.log(options)
          throw new Error("panel doesn't have a tag")
        }

        list.eachTagged(tag, function(task) {
          plan.add(generator, options)
          hours += HOUSE_PER_SECTION
        })
      })

      var materials = allocateMaterials(plan)

      console.log(materials.pieceCount+" materials")

      var invoice = invoiceMaterials(materials)

      invoice.lineItems.unshift({ description: "builder labor",
          subtotal: hours*HOURLY})

      var items = invoice.lineItems.map(function(item) {
        if (!item.description) {
          console.log(JSON.stringify(item))
          throw new Error()
        }

        return element([item.description+" $"+toDollarString(item.subtotal)])
      })

      var body = element([
        element("h1", list.story+" Bond"),
        element(items),
        element("p", [
        element("Tax: $"+toDollarString(invoice.tax)),
          element("Total: $"+toDollarString(invoice.total)),
        ]),
        element(".button", "Issue bond"),
      ])


      bridge.send(body)
    }


    function toDollarString(cents) {

      cents = Math.ceil(cents)

      var dollars = Math.floor(cents / 100)
      var remainder = cents - dollars*100
      if (remainder < 10) {
        remainder = "0"+remainder
      }

      return dollars+"."+remainder
    }



  }
)
