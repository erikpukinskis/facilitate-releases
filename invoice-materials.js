var library = require("module-library")(require)


module.exports = library.export(
  "invoice-materials",
  ["./some-materials"],
  function(BASE_MATERIALS) {

    function invoiceMaterials(materials) {

      var groups = materials.groupedByDescription()

      var lineItems = []

      for(var description in groups) {
        var group = groups[description]

        if (group[0].bulk) {
          lineItems.push(describeBulk(description, group))
        } else {
          lineItems.push(describePlanned(description, group))
        }
      }

      EXTRAS.forEach(function(extra) {
        lineItems.push(describeExtra(extra))
      })

      var subtotal = 0
      for(var i=0; i<lineItems.length; i++) {
        
        subtotal += lineItems[i].subtotal
      }

      var TAX_RATE = 0.095
      var salesTax = subtotal*TAX_RATE
      var total = subtotal + salesTax

      var invoice = {
        lineItems: lineItems,
        subtotal: subtotal,
        salesTax: salesTax,
        total: total,
      }

      return invoice
    }

    function describePlanned(description, group) {
      var group = {
        pieces: group,
      }

      for(var i=0; i<group.pieces.length; i++) {
        var piece = group.pieces[i]

        if (description == "door") {
          piece.description = piece.parts[0]
        } else {
          piece.description = cutPlanText(item)
        }
      }

      var material = BASE_MATERIALS[description]

      group.quantity = group.items.length + (material.extra || 0)
      group.price = material.price

      group.subtotal = group.quantity * price

      group.description = description

      if (material.unit) {
        group.unit = material.unit
      }

      if (material.extra) {
        group.extraCount = material.extra
      }

      return group
    }

    function describeBulk(description, group) {

      var group = {
        parts: group,
        isBulk: true,
      }

      var material = BASE_MATERIALS[description]
      var totalQuantity = 0
      var els = []
      var number = 1

      for(var i=0; i<group.parts.length; i++) {

        var part = group.parts[i]

        totalQuantity = totalQuantity + item.quantity
        part.unit = material.unit
        if (part.number) {
          throw new Error("shouldn't overwrite this?")
        }
        part.number = number
        number++
      }

      group.subtotal = Math.ceil(totalQuantity * material.price)

      group.description = description
      group.quantity = totalQuantity
      group.unit = material.unit
      group.price = material.price

      return group
    }

    function describeExtra(extra) {
      var lineItem = {
        isExtra: true,
        description: extra.description,
        quantity: extra.quantity,
        unit: extra.unit,
        price: extra.price,
        subtotal: extra.quantity * extra.price
      }

      return lineItem
    }

    function cutPlanText(item) {
      var text = ""

      if (!item.parts) {return false}

      for(var i=0; i<item.parts.length; i++) {
        if (i > 0) {
          text = text + " PLUS "
        }
        var name = item.parts[i]
        if (name) {
          text = text + item.parts[i] + " ("+dimensionText(item.cutLengths[i])+" "+item.cut+")"
        } else {
          text = text + dimensionText(item.cutLengths[i])
        }
      }

      return text
    }

    var EXTRAS = [
      {description: "liquid nails", unit: " tubes", price: 250, quantity: 4},
      {description: "screws", unit: "lb", price: 650, quantity: 4},
      {description: "side flange", unit: "CT", price: 277, quantity: 8},
      {description: "4ft aluminum tube", unit: "x", price: 1350, quantity: 4},
      {description: "weatherproof inlet", unit: "x", price: 1800, quantity: 1},
      {description: "cord", unit: " roll", price: 500, quantity: 1},
      {description: "GFCI outlet", unit: "x", price: 2000, quantity: 2},
      {description: "wiring box", unit: "x", price: 500, quantity: 2},
      {description: "wire", unit: "100ft", price: 50, quantity: 1},
      {description: "concealed door hinge", unit: "x", price: 2000, quantity: 6},
      {description: "floor vent", unit: "x", price: 500, quantity: 2},
      {description: "lumber crayons", unit: "x", price: 100, quantity: 2},
      {description: "PVC foam tape", unit: "x 75ft roll carton of 12", price: 6348,quantity: 1, url: "http://foamtapes.net/GasketTape/PVCFoamTape.aspx"}
    ]


    function dimensionText(number) {
      var integer = Math.floor(number)
      var remainder = number - integer
      var sixteenths = Math.round(remainder*16)

      if (sixteenths == 16) {
        integer++
        var text = ""
      } else if (sixteenths == 0) {
        var text = ""
      } else if (sixteenths == 8) {
        var text = " 1/2"
      } else if (sixteenths % 4 == 0) {
        var text = " "+(sixteenths/4)+"/4"
      } else if (sixteenths % 2 == 0) {
        var text = " "+(sixteenths/2)+"/8"
      } else {
        var text = " "+sixteenths+"/16"
      }

      text = integer.toString()+"\""+text

      return text
    }

    return invoiceMaterials
  }
)
