var library = require("module-library")(require)

module.exports = library.export(
  "bond-plugin",
  ["./house-plan", "./floor-section", "./face-wall", "./roof", "./door-section", "./allocate-materials", "./invoice-materials", "web-element"],
  function(HousePlan, floorSection, faceWall, roof, doorSection, allocateMaterials, invoiceMaterials, element) {
    var HOURLY = 2000
    var HOUSE_PER_SECTION = 8

    var BACK_WALL_INSIDE_HEIGHT = 80
    var SLOPE = 1/8
    var FLOOR_TOP = 96

    var backPlateRightHeight = roof.RAFTER_HEIGHT - HousePlan.verticalSlice(HousePlan.parts.twinWall.THICKNESS, SLOPE)

    var rafterContact = HousePlan.parts.stud.DEPTH+HousePlan.parts.plywood.THICKNESS*SLOPE

    var backPlateLeftHeight = backPlateRightHeight - rafterContact*SLOPE

    var rafterStart = {
      zPos: HousePlan.parts.stud.DEPTH + HousePlan.parts.plywood.THICKNESS,
      yPos: FLOOR_TOP - BACK_WALL_INSIDE_HEIGHT
    }

    var betweenRafterIntersections = 72 - rafterStart.zPos
    var elevationBetweenIntersections = betweenRafterIntersections*SLOPE

    var headerRafterIntersection = {
      xPos: 0,
      zPos: 72,
      yPos: rafterStart.yPos - elevationBetweenIntersections
    }

    var frontWallPosition = 48+24 - HousePlan.parts.stud.DEPTH

    var frontWallHeight = FLOOR_TOP - headerRafterIntersection.yPos 

    var backWallOptions = {
      xSize: 48,
      ySize: 80,
      topOverhang: backPlateLeftHeight - HousePlan.parts.plywood.THICKNESS*SLOPE,
      bottomOverhang: floorSection.HEIGHT,
      orientation: "north",
      slope: SLOPE,
      generator: faceWall,
    }

    var tagData = {
      "base floor section": {
        xSize: 48,
        zSize: 96,
        join: "right",
        generator: floorSection,
      },
      "2ft floor extension": {
        xSize: 24,
        zSize: 96,
        join: "left",
        generator: floorSection,
      },
      "back wall section": merge(
        backWallOptions,
        {
          leftBattenOverhang: HousePlan.parts.plywood.THICKNESS,
          joins: "right top-full",
          rightBattenOverhang: 0.75,
        }
      ),        
      "back wall extension": merge(
        backWallOptions,
        {
          joins: "left top-full",
          rightBattenOverhang: HousePlan.parts.plywood.THICKNESS,
        }
      ),
      "door section": {
        generator: doorSection,
        xSize: 48,
        joins: "right top-full",
        bottomOverhang: floorSection.HEIGHT,
        topOverhang: roof.RAFTER_HEIGHT,
        ySize: frontWallHeight
      },
      "window section": {
        generator: faceWall,
        ySize: frontWallHeight,
        xSize: 48,
        openingWidth: 24,
        openingHeight: 48,
        openingBottom: 39-12,
        openingLeft: 6,
        bottomOverhang: floorSection.HEIGHT,
        topOverhang: roof.RAFTER_HEIGHT,
        joins: "top-full left",
        rightBattenOverhang: HousePlan.parts.plywood.THICKNESS,
        orientation: "south",
        slopeBattens: false,
      },
      "roof": {
        generator: roof,
        slope: SLOPE,
      },
    }

    function register(list) {
      if (list.__bondPlugingRegisteredTags) { return }

      for(var tag in tagData) {
        list.registerTag(tag, tagData[tag])
      }

      list.__bondPlugingRegisteredTags = true
    }

    return function(list, bridge) {

      register(list)

      var plan = new HousePlan()
      var hours = 0

      for(var tag in tagData) {
        var generator = tagData[tag].generator

        list.eachTagged(tag,
          function(task, data) {
            if (!data) {
              throw new Error("boo")
            }
            plan.add(generator, data)
            hours += HOUSE_PER_SECTION
          }
        )
      }

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


    function merge(obj1,obj2){
      var obj3 = {};
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
      return obj3;
    }



  }
)
