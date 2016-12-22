var library = require("module-library")(require)

module.exports = library.export(
  "face-wall",
  function() {

    function faceWall(section, plywood, stud, trim, sloped, verticalSlice, insulation, getOverhangs, getJoinGaps, batten, options) {

      var BATTEN_WIDTH = batten.WIDTH

      if (!options.orientation) {
        throw new Error("face wall needs an orientation")
      }

      var wall = section(options)

      var hasOpening = !!options.openingWidth

      var openingTrimWidth = BATTEN_WIDTH

      var topOverhang = options.topOverhang || 0

      var bottomOverhang = options.bottomOverhang || 0

      var battenHeight = options.ySize + topOverhang + bottomOverhang

      var battenZPos = options.orientation == "south" ? stud.DEPTH + plywood.THICKNESS : -plywood.THICKNESS - trim.THICKNESS

      var batten = {
        section: wall,
        part: trim,
        "z-index": 100,
        xSize: BATTEN_WIDTH,
        zSize: trim.THICKNESS,
        yPos: bottomOverhang,
        ySize: -battenHeight,
        zPos: battenZPos,
        slope: options.slope,
      }

      var battenGenerator = options.slopeBattens === false ? trim : sloped


      if (typeof options.leftBattenOverhang != "undefined") {
        battenGenerator(batten, {
          name: options.name+"-batten-1",
          xPos: -options.leftBattenOverhang,
        })
      }

      var maxSegments = (options.xSize - 12)/24
      var bottomGap = options.middleBattenBottomGap||0

      for (var i=1; i<maxSegments; i++) {

        var xPos = 24*i - BATTEN_WIDTH/2

        if (i == 1 && hasOpening) {
          var ySize = bottomOverhang + options.openingBottom - openingTrimWidth
          trim(batten, {
            name: options.name+"-batten-2-below",
            xPos: xPos,
            yPos: bottomOverhang,
            ySize: -ySize,
          })

          var yPos = options.openingBottom + options.openingHeight - openingTrimWidth
          var ySize = options.ySize + topOverhang - yPos
          trim(batten, {
            name: options.name+"-batten-2-above",
            xPos: xPos,
            yPos: -yPos,
            ySize: -ySize,
          })
        } else {
          var yPos = bottomOverhang - bottomGap
          var ySize = -battenHeight + bottomGap

          battenGenerator(batten, {
            name: options.name+"-batten-2",
            xPos: xPos,
            yPos: yPos,
            ySize: ySize,
          })
        }
      }

      if (typeof options.rightBattenOverhang != "undefined") {
        battenGenerator(batten, {
          name: options.name+"-batten-2",
          xPos: options.xSize - BATTEN_WIDTH + options.rightBattenOverhang,
        })
      }

      // PLYWOOD

      var oppositeOrientation = options.orientation == "north" ? "south" : "north"

      var overhangs = getOverhangs(options)

      plywood({
        section: wall,
        name: options.name+"-interior",
        sanded: true,
        xPos: 0 - overhangs.left,
        xSize: options.xSize + overhangs.left + overhangs.right,
        yPos: 0,
        ySize: -options.ySize,
        zPos: options.orientation == "south" ? -plywood.THICKNESS : stud.DEPTH,
        orientation: oppositeOrientation
      })

      var sheathingHeight = options.ySize + overhangs.bottom + overhangs.top

      plywood({
        section: wall,
        name: options.name+"-sheathing",
        xPos: overhangs.left,
        xSize: options.xSize + overhangs.left + overhangs.right,
        ySize: -sheathingHeight,
        yPos: overhangs.bottom,
        zPos: options.orientation == "south" ? stud.DEPTH : -plywood.THICKNESS,
        orientation: options.orientation
      })

      var sheathingTopOverhang = overhangs.top + 1.5

      join = getJoinGaps(options)

      var plateSize = options.xSize

      stud({
        section: wall,
        name: options.name+"-bottom-track",
        orientation: "up-across",
        xPos: 0,
        xSize: plateSize,
        yPos: -stud.WIDTH - join.bottom
      })

      var studHeight = options.ySize - join.top - join.bottom

      stud({
        section: wall,
        name: options.name+"-top-track",
        orientation: "down-across",
        xPos: 0,
        xSize: plateSize,
        yPos: -options.ySize + join.top
      })

      var wallStud = {
        orientation: "west",
        ySize: -studHeight,
        yPos: -join.bottom
      }

      stud(wallStud, {
        section: wall,
        name: options.name+"-stud-1",
        orientation: "east",
        xPos: join.left,
      })

      var openingRightPos = 0

      if (hasOpening) {
        var openingLeftPos = Math.max(join.left + stud.WIDTH*2, options.openingLeft)

        var openingRightPos = openingLeftPos + options.openingWidth

        var yPos = options.openingBottom + options.openingHeight
        var ySize = studHeight - yPos
        var topStud = {
          section: wall,
          orientation: "east",
          yPos: -yPos,
          ySize: -ySize,
        }

        var bottomStud = {
          section: wall,
          orientation: "east",
          yPos: 0,
          ySize: -options.openingBottom,
        }

        for(var i=1; i<10; i++) {
          var tryOffset = i*16 + openingLeftPos
          var maxOffset = openingRightPos - 2

          if (tryOffset < maxOffset) {
            stud(bottomStud, {
              name: options.name+"-below-window-stud-"+i,
              xPos: tryOffset
            })

            stud(topStud, {
              name: options.name+"-above-window-stud-"+i,
              xPos: tryOffset
            })
          }
        }

        stud(wallStud, {
          section: wall,
          name: options.name+"-opening-left-stud",
          orientation: "west",
          xPos: openingLeftPos - stud.WIDTH,
        })

        trim(batten, {
          name: options.name+"-window-trim-left",
          xPos: openingLeftPos,
          xSize: -openingTrimWidth,
          ySize: -options.openingHeight,
          yPos: -options.openingBottom,
        })

        stud(wallStud, {
          section: wall,
          name: options.name+"-opening-right-stud",
          orientation: "east",
          xPos: openingRightPos,
        })

        trim(batten, {
          name: options.name+"-window-trim-left",
          xPos: openingRightPos,
          xSize: openingTrimWidth,
          ySize: -options.openingHeight,
          yPos: -options.openingBottom,
        })

        var windowTrack = {
          section: wall,
          xPos: openingLeftPos - stud.WIDTH,
          xSize: options.openingWidth + stud.WIDTH*2,
        }

        stud(windowTrack, {
          name: options.name+"-window-bottom-track",
          orientation: "down-across",
          yPos: -options.openingBottom,
        })

        var horizTrimWidth = options.openingWidth + openingTrimWidth*2

        trim(batten, {
          name: options.name+"-window-trim-bottom",
          xPos: openingLeftPos - openingTrimWidth,
          xSize: horizTrimWidth,
          yPos: -options.openingBottom,
          ySize: openingTrimWidth,
        })

        stud(windowTrack, {
          name: options.name+"-window-top-track",
          orientation: "up-across",
          yPos: -options.openingBottom - options.openingHeight - stud.WIDTH,
        })

        trim(batten, {
          name: options.name+"-window-trim-top",
          xPos: openingLeftPos - openingTrimWidth,
          xSize: horizTrimWidth,
          yPos: -options.openingBottom - options.openingHeight,
          ySize: -openingTrimWidth,
        })

        var minStudOffset = openingRightPos + 2
      }

      var maxStudOffset = options.xSize - join.right - stud.WIDTH
      var insulated = 0


      var next = Math.floor(openingRightPos/16) + 1

      for(var i=next; i<8; i++){
        var tryOffset = 16*i - stud.WIDTH/2

        if (tryOffset + 3 > maxStudOffset) {
          var offset = maxStudOffset
          var bail = true
        } else if (minStudOffset && tryOffset < minStudOffset) {
          continue
        } else {
          var offset = tryOffset
          var bail = false
        }

        if (bail && join.right) {
          trim({
            section: wall,
            name: options.name+"-joining-stud",
            xPos: options.xSize - 0.75,
            xSize: 1.5,
            zSize: stud.DEPTH,
            yPos: -join.bottom,
            ySize: -studHeight,
          })
        } else {

          stud(wallStud, {
            section: wall,
            name: options.name+"-stud-"+(i+1),
            xPos: offset,
          })

        }

        var insulationWidth = offset - insulated

        insulation({
          section: wall,
          name: options.name+"-insulation-"+(i+1),
          xPos: insulated,
          xSize: insulationWidth,
          yPos: 0,
          zPos: 0,
          zSize: stud.DEPTH,
          ySize: -80,
        })

        insulated = offset

        if (bail) { break }
      }

    }

    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    return faceWall
  }
)
