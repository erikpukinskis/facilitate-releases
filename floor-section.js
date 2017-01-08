var library = require("module-library")(require)

module.exports = library.export(
  "floor-section",
  function() {

    var FLOORING_THICKNESS = floorSection.FLOORING_THICKNESS = 0
    var SUBFLOOR_THICKNESS = 5/8
    var STUD_DEPTH = 2.5
    var SHEATHING_THICKNESS = 3/8

    floorSection.HEIGHT = FLOORING_THICKNESS + SUBFLOOR_THICKNESS + STUD_DEPTH + SHEATHING_THICKNESS

    function floorSection(section, plywood, stud, insulation, flooring, trim, options) {

      if (!options.zSize) {
        console.log("options", options)
        throw new Error("floor section must have a zSize")
      }

      var id = options.name

      var floor = section(
        pick(options, "name", "xPos", "yPos", "zPos")
      )

      var letters = ["A","B","C", "D"]

      for(var i=0; i<3; i++) {
        insulation({
          section: floor,
          name: options.name+"-insulation-"+letters[i],
          xPos: 1+i*16,
          xSize: 14,
          yPos: 1,
          ySize: 2,
          zPos: 1,
          zSize: options.zSize-2,
        })
      }

      var trackLength = options.xSize

      var framingOffset = 0
      if (options.join == "left") {
        framingOffset = 1.0
      }

      stud({
        section: floor,
        name: id+"-back-track",
        xPos: 0,
        xSize: trackLength,
        yPos: FLOORING_THICKNESS + SUBFLOOR_THICKNESS,
        orientation: "horizontal-south"
      })

      if (Number.isNaN(options.zSize - stud.WIDTH)) {
        debugger
      }
      stud({
        section: floor,
        name: id+"-front-track",
        xPos: 0,
        xSize: trackLength,
        yPos: FLOORING_THICKNESS + SUBFLOOR_THICKNESS,
        zPos: options.zSize - stud.WIDTH,
        orientation: "horizontal-north"
      })

      var joist = {
        section: floor,
        orientation: "horizontal-east",
        xPos: framingOffset,
        yPos: FLOORING_THICKNESS + SUBFLOOR_THICKNESS,
        ySize: stud.DEPTH,
        zSize: 72
      }

      stud(joist, {
        name: id+"-joist-A",
        xPos: framingOffset,
      })

      stud(joist, {
        name: id+"-joist-B",
        xPos: 16 - stud.WIDTH/2,
      })

      stud(joist, {
        name: id+"-joist-C",
        xPos: 16*2 - stud.WIDTH/2,
      })

      if (options.join == "right") {
        trim({
          section: floor,
          name: "floor-joining-joist",
          xPos: 48 - 0.75,
          xSize: 1.5,
          yPos: FLOORING_THICKNESS + SUBFLOOR_THICKNESS,
          ySize: stud.DEPTH,
          zSize: options.zSize,
        })
      } else {
        stud(joist, {
          name: id+"-joist-D",
          orientation: "horizontal-west",
          xPos: 48 - stud.WIDTH,
        })
      }

      plywood({
        section: floor,
        name: id+"-subfloor",
        xPos: 0,
        xSize: options.xSize,
        yPos: 1/4,
        ySize: SUBFLOOR_THICKNESS,
        zSize: options.zSize,
        orientation: "up"
      })

      flooring({
        section: floor,
        name: id+"-flooring",
        xPos: 0,
        xSize: options.xSize,
        yPos: 0,
        ySize: 1/4,
        zSize: options.zSize,
      })

      plywood({
        section: floor,
        name: id+"-sheathing",
        xSize: options.xSize,
        yPos: FLOORING_THICKNESS + SUBFLOOR_THICKNESS + stud.DEPTH,
        zSize: options.zSize,
        orientation: "down"
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

    return floorSection
  }
)
