var library = require("module-library")(require)


library.define(
  "create-invoice",
  function() {

    function Invoice() {
      this.lineItems = []
      this.subtotal = 0
      this.tax = 0
      this.total = 0
    }

    var TAX_RATE = 0.095

    Invoice.prototype.addLineItem = function(lineItem) {

      var subtotal = lineItem.subtotal = lineItem.quantity*lineItem.price
      var tax = subtotal*TAX_RATE

      this.subtotal += subtotal
      this.tax += tax
      this.total += subtotal + tax

      this.lineItems.push(lineItem)
    }

    function createInvoice() {
      return new Invoice()
    }
  
    // var subtotal = 0
    // for(var i=0; i<lineItems.length; i++) {
      
    //   subtotal += lineItems[i].subtotal
    // }

    // var salesTax = subtotal*TAX_RATE
    // var total = subtotal + salesTax

    // var invoice = {
    //   lineItems: lineItems,
    //   subtotal: subtotal,
    //   salesTax: salesTax,
    //   total: total,
    // }

    return createInvoice
  }
)



module.exports = library.export(
  "invoice-materials",
  ["./some-materials", "create-invoice"],
  function(BASE_MATERIALS, createInvoice) {

    function invoiceMaterials(materials) {

      var groups = materials.groupedByDescription()

      var invoice = createInvoice()

      for(var description in groups) {
        var group = groups[description]

        if (group[0].bulk) {
          addBulk(description, group, invoice)
        } else {
          addPlanned(description, group, invoice)
        }
      }

      EXTRAS.forEach(function(extra) {
        addExtra(extra, invoice)
      })

      return invoice
    }

    function addPlanned(description, pieces, invoice) {

      var material = BASE_MATERIALS[description]

      var quantity = pieces.length + (material.extra || 0)
      var price = material.price

      invoice.addLineItem({
        description: description,
        quantity: quantity,
        price: price,
        unit: material.unit
      })
    }

    function addBulk(description, lots, invoice) {

      var material = BASE_MATERIALS[description]

      var totalQuantity = 0
      for(var i=0; i<lots.length; i++) {
        var lot = lots[i]
        totalQuantity = totalQuantity + lot.quantity
      }

      invoice.addLineItem({
        description: description,
        quantity: totalQuantity,
        price: material.price,
        unit: material.unit,
      })
    }

    function addExtra(extra, invoice) {
      invoice.addLineItem(extra)
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

    return invoiceMaterials
  }
)
