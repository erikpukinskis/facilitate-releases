var library = require("module-library")(require)

module.exports = library.export(
  "house-plan",
  function() {

    function HousePlan() {
      this.generators = []
      this.parameterSets = []
      this.indexesByName = {}
    }

    HousePlan.parts = {
      stud: {
        WIDTH: 1.25,
        DEPTH: 2.5,
      },
      plywood: {
        THICKNESS: 3/8,
      },
      trim: {
        THICKNESS: 0.75,
      },
      door: {
        WIDTH: 32,
        THICKNESS: 1.5,
        HEIGHT: 80,
      },
      batten: {
        WIDTH: 1.5,
      },
      twinWall: {
        THICKNESS: 0.314961 // 8mm
      },
    }

    var helpers = HousePlan.helpers = {
      verticalSlice: verticalSlice,
      sliceToNormal: sliceToNormal,
      slopeToDegrees: slopeToDegrees,
      slopeToRadians: slopeToRadians,
      getJoinGaps: getJoinGaps,
      getOverhangs: getOverhangs,
    }

    function getJoinGaps(options) {
      var joins = {}

      ;["left", "right", "top", "bottom"].forEach(function(direction) {

        var hasJoin = options.joins.match(direction)
        var isFullDepth = options.joins.match(direction+"-full")

        if (isFullDepth) {
          joins[direction] = 1.5
        } else if (hasJoin) {
          joins[direction] = 0.75
        } else {
          joins[direction] = 0
        }
      })

      return joins
    }

    function getOverhangs(options) {
      return {
        left: options.leftOverhang || 0,
        right: options.rightOverhang || 0,
        top: options.topOverhang || 0,
        bottom: options.bottomOverhang || 0,
      }
    }
    

    HousePlan.prototype.generate =
      function(getHandler) {


        for(var i=0; i<this.generators.length; i++) {

          var generator = this.generators[i]

          var names = argNames(generator)

          var args = []

          names.forEach(function(name) {
            var handler = getHandler(name)
            if (!handler) {
              handler = helpers[name]
            }
            if (handler) {
              addConstants(handler, name)
              args.push(handler)
            }
          })

          args = args.concat(this.parameterSets[i])

          var boundGenerator = Function.prototype.apply.bind(generator, null, args)

          boundGenerator()
        }

      }

    function addConstants(handler, name) {
      ;["DEPTH", "WIDTH", "HEIGHT", "THICKNESS"].forEach(function(dimension) {
        var basePart = HousePlan.parts[name]
        if (!handler[dimension] && basePart) {
          handler[dimension] = basePart[dimension]
        }
      })
    }
    
    function argNames(func) {
      var pattern = /^function[ a-zA-Z]*\(([a-zA-Z, ]*)/
      var argString = func.toString().match(pattern)[1]

      if (argString) {
        return argString.split(/, ?/)
      } else {
        return []
      }
    }

    HousePlan.prototype.add =
      function add(generator, options) {
        var parameters = []
  
        // oi this is very hacky, conventional
        if (typeof options == "object" && typeof options.name == "string") {
          this.indexesByName[options.name] = this.generators.length
        }
  
        for(var i=1; i<arguments.length; i++) {
          var arg = arguments[i]
          if (arg.name) {
            name = arg.name
          }
          parameters.push(arg)
        }

        this.generators.push(generator)
        this.parameterSets.push(parameters)
      }

    HousePlan.prototype.getOptions =
      function(name) {
        var i = this.indexesByName[name]
        if (typeof i == "undefined") {
          throw new Error("House plan doesn't seem to have defined a section called "+name+". Only "+Object.keys(this.indexesByName).join(", "))
        }
        
        return this.parameterSets[i][0]
      }

    function verticalSlice(thickness, slope) {
      if (typeof slope == "undefined") {
        throw new Error("verticalSlice takes a thickness and a slope. ou only provided one")
      }

      var angle = slopeToRadians(slope)
      var slice = thickness/Math.cos(angle)

      return slice
    }

    function sliceToNormal(slice, slope) {
      if (typeof slope == "undefined") {
        throw new Error("verticalSliceToNormal takes a thickness and a slope. You only provided one")
      }

      var angle = slopeToRadians(slope)
      var normal = slice*Math.cos(angle)

      return normal
    }

    function slopeToDegrees(slope) {
      return 180*slopeToRadians(slope)/Math.PI
    }

    function slopeToRadians(slope) {
      return Math.atan(slope)
    }


    HousePlan.verticalSlice = verticalSlice

    return HousePlan
  }
)