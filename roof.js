var library = require("module-library")(require)

module.exports = library.export(
  "roof",
  function() {

    var RAFTER_HEIGHT = 3.5
    var RAFTER_WIDTH = 1.5

    function roof(section, twinWall, trim, stud, plywood, tilted, verticalSlice, shade, options) {

      var roof = section(
        pick(options, "name", "zPos", "yPos")
      )

      var roofLength = Math.sqrt(96*96 - 12*12)

      var backOverhang = 8

      var rafter = {
        part: trim,
        section: roof,
        tilt: options.slope,
        xSize: RAFTER_WIDTH,
        yPos: -RAFTER_HEIGHT + backOverhang*options.slope,
        ySize: RAFTER_HEIGHT,
        zPos: -backOverhang,
        zSize: roofLength,
      }

      var centerLine = 48 - plywood.THICKNESS

      tilted(rafter, {
        xPos: 0,
        name: "left-rafter"
      })

      var yPos = -RAFTER_HEIGHT + backOverhang*options.slope

      tilted(rafter, {
        xPos: centerLine - 0.75,
        name: "center-rafter"
      })

      tilted(rafter, {
        xPos: 96 - plywood.THICKNESS*2 - RAFTER_WIDTH,
        name: "right-rafter"
      })

      var roofHeight = RAFTER_HEIGHT - stud.DEPTH*options.slope

      var CAP_WIDTH = 7.25

      var roofCap = {
        part: trim,
        section: roof,
        tilt: options.slope,
        xSize: CAP_WIDTH,
        yPos: -verticalSlice(RAFTER_HEIGHT + trim.THICKNESS, options.slope) + backOverhang*options.slope,
        ySize: trim.THICKNESS,
        zPos: -backOverhang,
        zSize: roofLength
      }

      var overhang = 4.25

      tilted(roofCap, {
        xPos: -overhang,
        name: "left-roof-cap"
      })

      tilted(roofCap, {
        xPos: centerLine - CAP_WIDTH/2,
        name: "center-roof-cap",
      })

      tilted(roofCap, {
        xPos: 96 - plywood.THICKNESS * 2 - CAP_WIDTH + overhang,
        name: "right-roof-cap",
      })

      var roofPanel = {
        part: twinWall,
        section: roof,
        tilt: options.slope,
        yPos: -RAFTER_HEIGHT - plywood.THICKNESS*options.slope + backOverhang*options.slope,
        ySize: twinWall.THICKNESS,
        zPos: -backOverhang,
        zSize: roofLength
      }

      tilted(roofPanel, {
        name: "left-twin-wall",
        xPos: RAFTER_WIDTH,
        xSize: 48 - plywood.THICKNESS - RAFTER_WIDTH*1.5
      })

      tilted(roofPanel, {
        name: "right-twin-wall",
        xPos: centerLine+0.75,
        xSize: 48 - RAFTER_WIDTH*1.5 - plywood.THICKNESS
      })

      var rafterPositions = {
        "left": RAFTER_WIDTH,
        "center-left": centerLine - RAFTER_WIDTH/2 - 1.5,
        "center-right": centerLine + RAFTER_WIDTH/2,
        "right": 96 - plywood.THICKNESS*2 - stud.DEPTH - 0.5
      }

      var shadeRail = {
        part: trim,
        section: roof,
        tilt: options.slope,
        xSize: 1.5,
        yPos: (plywood.THICKNESS + stud.DEPTH - RAFTER_WIDTH)*options.slope,
        ySize: -1,
        zPos: -plywood.THICKNESS - stud.DEPTH + RAFTER_WIDTH,
        zSize: 72 - RAFTER_WIDTH*2 - 5
      }

      var roofRail = merge(shadeRail, {
        yPos: (plywood.THICKNESS + stud.DEPTH - RAFTER_WIDTH)*options.slope - verticalSlice(RAFTER_HEIGHT - twinWall.THICKNESS, options.slope),
        ySize: 1,
      })

      for(var rafterName in rafterPositions) {

        tilted(shadeRail, {
          name: rafterName+"-shade-rail",
          xPos: rafterPositions[rafterName],
        })

        tilted(roofRail, {
          name: rafterName+"-roof-rail",
          xPos: rafterPositions[rafterName],
        })

      }


      var ceilingShade = {
        section: roof,
        part: shade,
        tilt: options.slope,
        xSize: 44.5,
        ySize: -0.5,
        yPos: -1,
        zSize: 72 - stud.DEPTH*2 - plywood.THICKNESS*2,
        zPos: 0,
      }

      tilted(ceilingShade, {
        name: "left-ceiling-shade",
        xPos: 2,
      })

      tilted(ceilingShade, {
        name: "right-ceiling-shade",
        xPos: 49,
      })


    }

    function pick(object) {
      var keys = Array.prototype.slice.call(arguments, 1)
      var light = {}
      keys.forEach(function(key) {
        light[key] = object[key]
      })
      return light
    }

    function merge(obj1,obj2){
      var obj3 = {};
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
      return obj3;
    }
    
    roof.RAFTER_WIDTH = RAFTER_WIDTH
    roof.RAFTER_HEIGHT = RAFTER_HEIGHT

    return roof
  }
)
