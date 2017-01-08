var library = require("module-library")(require)

module.exports = library.export(
  "bond-plugin",
  ["./house-plan", "./floor-section", "./allocate-materials", "./invoice-materials", "web-element"],
  function(HousePlan, floorSection, allocateMaterials, invoiceMaterials, element) {
    var HOURLY = 2000
    var HOUSE_PER_SECTION = 8

    function register(list) {
      if (list.__bondPlugingRegisteredTags) { return }

      list.registerTag(
        "base floor section",
        {
          xSize: 48,
          zSize: 96,
          join: "right",
        }
      )

      list.registerTag("2ft floor extension", {
        xSize: 24,
        zSize: 96,
        join: "left",
      })

      list.__bondPlugingRegisteredTags = true
    }

    return function(list, bridge) {

      register(list)

      var plan = new HousePlan()
      var hours = 0

      var generators = {
        "base floor section": floorSection,
        "2ft floor extension": floorSection,
      }

      for(var tag in generators) {
        var generator = generators[tag]

        list.eachTagged(tag,
          function(task, data) {
            plan.add(generator, data)
            hours += HOUSE_PER_SECTION
          }
        )
      }

      var materials = allocateMaterials(plan)

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
