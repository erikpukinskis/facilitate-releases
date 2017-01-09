var library = require("module-library")(require)

module.exports = library.export(
  "doors",
  ["./house-plan", "./floor-section", "./face-wall"],
  function(HousePlan, floorSection, faceWall) {

    var DOOR_GAP = 1/4

    var OPENING_HEIGHT = 
      HousePlan.parts.trim.THICKNESS*2 + HousePlan.parts.door.HEIGHT + DOOR_GAP

    var OPENING_WIDTH = HousePlan.parts.trim.THICKNESS*2 + HousePlan.parts.door.WIDTH*2 + DOOR_GAP*2

    var TRIM_WIDTH = 3.5 
    var BATTEN_WIDTH = HousePlan.parts.batten.WIDTH

    console.log("door trim width:", TRIM_WIDTH)

    function doors(section, door, trim, plywood, stud, sloped, verticalSlice, options) {

      var joins = HousePlan.helpers.getJoinGaps(options)

      var overhangs = HousePlan.helpers.getOverhangs(options)

      var opening = section(options)

      var jambWidth = plywood.THICKNESS*2 + stud.DEPTH + 0.5

      var rightWallExtra = TRIM_WIDTH - trim.THICKNESS - DOOR_GAP - stud.WIDTH - 0.75 + BATTEN_WIDTH/2

      console.log("extra:", rightWallExtra)

      var rightWallWidth = TRIM_WIDTH - trim.THICKNESS - DOOR_GAP - BATTEN_WIDTH/2

      var doorOpeningWidth = door.WIDTH + trim.THICKNESS*2 + DOOR_GAP*2

      var leftWallWidth = options.xSize - rightWallWidth - doorOpeningWidth

      var studHeight = options.ySize - joins.top - joins.bottom

      var fullHeightStud = {
        section: opening,
        yPos: 0,
        ySize: -studHeight,
        zPos: 0,
        zSize: -stud.DEPTH,
      }

      stud({
        section: opening,
        name: options.name+"-bottom-track",
        orientation: "up-across",
        xPos: 0,
        xSize: options.xSize,
        yPos: -stud.WIDTH,
        zPos: -stud.DEPTH,
      })

      stud({
        section: opening,
        name: options.name+"-top-track",
        orientation: "down-across",
        xPos: 0,
        xSize: options.xSize,
        yPos: -studHeight,
        zPos: -stud.DEPTH,
      })

      trim({
        section: opening,
        name: "front-top-plate",
        xSize: 96,
        yPos: -studHeight,
        ySize: -1.5,
        zSize: stud.DEPTH,
        zPos: -stud.DEPTH,
      })

      stud({
        section: opening,
        name: options.name+"-header-track",
        orientation: "up-across",
        xPos: leftWallWidth - stud.WIDTH,
        xSize: doorOpeningWidth + stud.WIDTH*2,
        yPos: -door.HEIGHT - trim.THICKNESS*2 - DOOR_GAP - stud.WIDTH,
        zPos: -stud.DEPTH,
      })

      stud(fullHeightStud, {
        name: options.name+"-stud-A",
        xPos: 0,        
        orientation: "east",
      })

      stud(fullHeightStud, {
        name: options.name+"-stud-B",
        xPos: leftWallWidth,  
        xSize: -stud.WIDTH,      
        orientation: "west",
      })

      stud(fullHeightStud, {
        name: options.name+"-stud-C",
        xPos: leftWallWidth + doorOpeningWidth,
        orientation: "east",
      })

      trim(fullHeightStud, {
        name: options.name+"-joining-stud",
        xPos: options.xSize - joins.right,
        xSize: 1.5,
        zSize: -stud.DEPTH,
      })

      door({
        section: opening,
        name: "left-door",
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS,
        xSize: door.WIDTH,
        yPos: -trim.THICKNESS,
        ySize: -door.HEIGHT,
        zPos: 0,
        zSize: -door.THICKNESS,
        orientation: "east",
      })

      var sheathingHeight = options.ySize + overhangs.bottom + overhangs.top

      plywood({
        section: opening,
        name: options.name+"-sheathing",
        xPos: 0,
        xSize: options.xSize,
        yPos: 0,
        ySize: -options.ySize,
        zPos: -stud.DEPTH - plywood.THICKNESS,
        orientation: "north",
      })

      plywood({
        section: opening,
        name: options.name+"-interior",
        xPos: 0,
        xSize: options.xSize,
        yPos: floorSection.HEIGHT,
        ySize: -sheathingHeight
        ,
        orientation: "south"
      })

      var jambDepth = plywood.THICKNESS

      trim({
        section: opening,
        name: "left-door-jamb",
        xPos: leftWallWidth + DOOR_GAP,
        yPos: -trim.THICKNESS,
        ySize: -door.HEIGHT,
        zPos: jambDepth,
        zSize: -jambWidth,
      })

      trim({
        section: opening,
        name: "right-door-jamb",
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS + door.WIDTH,
        yPos: -trim.THICKNESS,
        ySize: -door.HEIGHT,
        zPos: jambDepth,
        zSize: -jambWidth,
      })

      trim({
        section: opening,
        name: "top-door-jamb",
        xPos: leftWallWidth + DOOR_GAP,
        xSize: trim.THICKNESS*2 + door.WIDTH,
        yPos: -door.HEIGHT - trim.THICKNESS*2,
        zPos: jambDepth,
        zSize: -jambWidth,
      })

      trim({
        section: opening,
        name: "bottom-door-jamb",
        xPos: leftWallWidth + DOOR_GAP,
        xSize: trim.THICKNESS*2 + door.WIDTH,
        yPos: -trim.THICKNESS,
        zPos: jambDepth,
        zSize: -jambWidth,
      })


      var bg2 = "rgba(255,150,0,0.9)"
      var bg3 = "rgba(170,255,0,0.9)"
      var bg = bg2 = bg3 = null //"rgba(255,255,0,0.9)"

      trim({
        section: opening,
        name: "below-door-trim",
        background: bg2,
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS,
        xSize: door.WIDTH,
        ySize: TRIM_WIDTH,
        yPos: -trim.THICKNESS,
        zPos: plywood.THICKNESS
      })

      trim({
        section: opening,
        name: "above-door-trim",
        background: bg,
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS,
        xSize: door.WIDTH,
        ySize: -TRIM_WIDTH,
        yPos: -door.HEIGHT - trim.THICKNESS,
        zPos: plywood.THICKNESS
      })

      var sideTrimHeight = door.HEIGHT +TRIM_WIDTH*2

      var sideTrim = {
        section: opening,
        background: bg2,
        xSize: -TRIM_WIDTH,
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS,
        yPos: TRIM_WIDTH - trim.THICKNESS,
        ySize: -sideTrimHeight,
        zPos: plywood.THICKNESS
      }

      trim(sideTrim, {
        name: "left-door-trim",
        xSize: -TRIM_WIDTH,
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS,
      })

      trim(sideTrim, {
        name: "right-door-trim",
        xSize: TRIM_WIDTH,
        xPos: leftWallWidth + DOOR_GAP + trim.THICKNESS + door.WIDTH,
      })

      var batten = {
        section: opening,
        xSize: HousePlan.parts.batten.WIDTH,
        yPos: floorSection.HEIGHT,
        ySize: -sheathingHeight,
        zPos: plywood.THICKNESS,
      }

      trim(batten, {
        name: options.name+"-left-batten",
        xPos: -plywood.THICKNESS,
      })

      // trim(batten, {
      //   name: options.name+"-right-batten",
      //   xPos: options.xSize - HousePlan.parts.batten.WIDTH/2,
      // })

      var yPos = options.ySize + overhangs.top

      var ySize = yPos - trim.THICKNESS - door.HEIGHT - TRIM_WIDTH

      var miniBatten = {
        section: opening,
        xSize: HousePlan.parts.batten.WIDTH,
        yPos: -yPos,
        ySize: ySize,
        zPos: plywood.THICKNESS,
      }

      trim(miniBatten, {
        name: options.name+"-middle-mini-batten",
        xPos: options.xSize/2,

      })

      trim(miniBatten, {
        name: options.name+"-right-mini-batten",
        xPos: options.xSize - BATTEN_WIDTH/2,
      })


    }

    // doors.OPENING_HEIGHT = OPENING_HEIGHT
    // doors.OPENING_WIDTH = OPENING_WIDTH
    doors.TRIM_WIDTH = TRIM_WIDTH
    doors.GAP = DOOR_GAP
    return doors
  }
)