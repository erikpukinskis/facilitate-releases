var library = require("module-library")(require)

module.exports = library.export(
  "side-wall",
  ["./house-plan", "./roof", "./floor-section"],
  function(HousePlan, roof, floorSection) {

    function sideWall(section, stud, plywood, sloped, trim, sloped, tilted, verticalSlice, insulation, getJoinGaps, getOverhangs, options) {

      var wall = section(
        pick(options, "name", "xPos", "yPos", "zPos")
      )

      var name = options.name
      var whichSide = options.whichSide
      var flip = whichSide == "right"

      var joins = getJoinGaps(options)

      var innerTopOverhang = verticalSlice(joins.top, options.slope)

      var wallThickness = stud.DEPTH + plywood.THICKNESS

      var overhangs = getOverhangs(options)

      if (options.name == "left-wall-A") {
        console.log("side wall overhang: ", overhangs.left)
      }

      var sheathingHeight = options.ySize + overhangs.top + overhangs.bottom + overhangs.right*options.slope

      var sheathingWidth = options.zSize + overhangs.left + overhangs.right

      if (sheathingWidth == 24) {
        sheathingWidth = 23.875
      }
      
      var interiorWidth = options.zSize

      var interiorHeight = options.ySize

      verticalSlice(0.75, options.slope) + (options.zPos + interiorWidth)*options.slope

      describePly("sheathing height", options.zSize, sheathingHeight)

      console.log("zPos:", options.zPos, "leftHang:", overhangs.left)
      sloped({
        section: wall,
        name: name+"-sheathing",
        part: plywood,
        xPos: flip ? stud.DEPTH : -plywood.THICKNESS,
        ySize: -sheathingHeight,
        zPos: -overhangs.left,
        zSize: sheathingWidth,
        slope: options.slope,
        orientation: flip ? "east" : "west",
        yPos: floorSection.HEIGHT
      })

      describePly("interior height", interiorWidth, interiorHeight)

      sloped({
        section: wall,
        name: name+"-interior",
        part: plywood,
        sanded: true,
        "z-index": "100",
        xPos: flip ? -plywood.THICKNESS : stud.DEPTH,
        zPos: 0,
        orientation: flip ? "west" : "east",
        zSize: interiorWidth,
        ySize: -interiorHeight,
        slope: options.slope,
        yPos: 0
      })

      var studHeightAtZero = options.ySize - options.zSize*options.slope - verticalSlice(joins.top, options.slope) - joins.bottom

      var sideStud = {
        part: stud,
        orientation: "north",
        zSize: stud.WIDTH,
        slope: 1/6,
        yPos: 0
      }

      var studRise = options.slope*stud.WIDTH

      var offset = joins.left
      var firstStudHeight = studHeightAtZero + offset*options.slope + studRise

      sloped(sideStud, {
        section: wall,
        name: name+"-stud-1",
        orientation: "south",
        zPos: offset,
        ySize: -firstStudHeight,
      })

      describeStud(1, firstStudHeight)

      function describeStud(name, height) {
        if (options.name != "left-wall-A") {return}
        var shorterHeight = height - options.slope*stud.WIDTH
      }

      function describePly(name, width, height) {
        if (options.name != "left-wall-A") {return}
        var shorterHeight = height - options.slope*width
      }

      function describe(name, dimension) {
        if (options.name != "left-wall-A") {return}
      }

      var maxOffset = options.zSize - joins.right - stud.WIDTH

      var distance = 0

      for(var i=1; i<4; i++) {

        var tryOffset = offset = 16*i - stud.WIDTH/2 - overhangs.left

        var bail = false
        if (tryOffset + stud.WIDTH + 1 > maxOffset) {
          offset = maxOffset
          bail = true
        }

        var studHeight = studHeightAtZero + offset*options.slope + studRise
        describeStud(i+1, studHeight)

        sloped(sideStud, {
          section: wall,
          name: name+"-stud-"+(i+1),
          zPos: offset,
          ySize: -studHeight,
        })

        var insulationWidth = offset - distance

        sloped({
          part: insulation,
          name: name+"-insulation-"+(i+1),
          slope: options.slope,
          section: wall,
          zPos: distance,
          zSize: insulationWidth,
          yPos: 0,
          ySize: -83 - (distance + insulationWidth)*options.slope
        })

        distance = offset

        if (bail) { break }
      }

      describe("side wall bottom plate", options.zSize)
      stud({
        section: wall,
        name: name+"-bottom-track",
        orientation: "up",
        yPos: -stud.WIDTH,
        zPos: 0,
        zSize: options.zSize,
      })

      describe("side wall sheathing corner overhang", overhangs.left)

      tilted({
        section: wall,
        part: stud,
        tilt: options.slope,
        name: name+"-top-track",
        orientation: "down",
        ySize: stud.WIDTH,
        yPos: -studHeightAtZero,
        zPos: 0,
        zSize: options.zSize,
      })

      var plateLength = options.zSize
      var rise = plateLength*options.slope
      var topLength = Math.sqrt(rise*rise+plateLength*plateLength)
      describe("side wall top plate", topLength)

      var battenXPos = flip ? stud.DEPTH + plywood.THICKNESS : -plywood.THICKNESS - trim.THICKNESS

      var battenWidth = HousePlan.parts.batten.WIDTH

      var batten = {
        section: wall,
        part: trim,
        slope: options.slope,
        xPos: battenXPos,
        yPos: floorSection.HEIGHT,
        zSize: -battenWidth,
      }

      var offset = -overhangs.left + plywood.THICKNESS + trim.THICKNESS
      var width = battenWidth + trim.THICKNESS

      var insideHeightAtBackWall = options.ySize - options.zSize*options.slope

      var studHeightAtWallStart = insideHeightAtBackWall - verticalSlice(joins.top, options.slope)

      var rafterHeight = verticalSlice(roof.RAFTER_HEIGHT, options.slope)

      var battenHeightAtZero = studHeightAtWallStart + floorSection.HEIGHT + rafterHeight

      if (!joins.left) {
        var height = battenHeightAtZero + offset*options.slope

        sloped(batten, {
          name: name+"-batten-A",
          ySize: -height,
          zPos: offset,
          zSize: -width
        })
      }

      var lastBattenOverhang = joins.right ? battenWidth/2 : plywood.THICKNESS + trim.THICKNESS

      var maxBattenOffset = options.zSize + overhangs.right + lastBattenOverhang

      var lastBattenWidth = overhangs.right ? battenWidth + trim.THICKNESS : battenWidth

      for(var i=1; i<3; i++) {

        var tryOffset = offset = 24*i + battenWidth/2

        var bail = false

        var isLastOne = tryOffset + battenWidth + 1 > maxBattenOffset

        if (isLastOne) {
          offset = maxBattenOffset
          bail = true
        }

        var height = battenHeightAtZero + offset*options.slope

        sloped(batten, {
          name: name+"-batten-B",
          ySize: -height,
          zPos: offset,
          zSize: isLastOne ? -lastBattenWidth : -battenWidth
        })

        if (bail) { break }
      }

      if (joins.right > 0) {
        var ySize = studHeightAtZero + (options.zSize + 0.75)*options.slope

        sloped({
          name: options.name+"-joining-stud",
          section: wall,
          part: trim,
          xPos: 0,
          xSize: stud.DEPTH,
          zPos: options.zSize - 0.75,
          zSize: 1.5,
          yPos: 0,
          ySize: -ySize,
          slope: options.slope,
        })
      }

    }

    function pick(object) {
      var keys = Array.prototype.slice.call(arguments, 1)
      var light = {}
      keys.forEach(function(key) {
        light[key] = object[key]
      })
      return light
    }

    return sideWall
  }
)