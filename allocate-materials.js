var library = require("module-library")(require)


library.define(
  "set-of-materials",
  ["./some-materials"],
  function(BASE_MATERIALS) {

    function SetOfMaterials() {
      this.byDescription = {}
      this.scrapsByName = {}
      this.scrapsByQuery = {}
      this.pieceCount = 0
      this.get = get.bind(this)
    }

    SetOfMaterials.prototype.groupedByDescription = function() {
        return this.byDescription
      }

    function ofKind(description, set) {
      var group = set.byDescription[description]

      if (!group) {
        group = set.byDescription[description] = []
      }

      return group
    }

    SetOfMaterials.prototype.reserveBulk =
      function(description, quantity, name) {

        var group = ofKind(description, this)

        var material = {
          name: name,
          quantity: quantity,
          bulk: true
        }

        // PERSIST
        group.push(material)

        return material
      }

    SetOfMaterials.prototype.reserve =
      function(description, cut, size) {

        var group = ofKind(description, this)

        for(var i=0; i<group.length; i++) {
          var material = group[i]

          if (material.cut != cut) {
            continue
          }

          if (cut == "rip" && material.width >= size) {
            return material
          } else if (cut == "cross" && material.length >= size) {
            return material
          }
        }

        var base = BASE_MATERIALS[description]

        if (!base) {
          throw new Error("Add "+description+" to base materials")
        }

        material = merge(base, {
          parts: [],
          cutLengths: [],
          description: description,
          number: group.length + 1
        })

        this.pieceCount++

        // PERSIST

        group.push(material)

        return material
      }

    function getWildcard(set, query) {
      if (set.prefix) {
        query = set.prefix+"-"+query
      }
      pattern = "^"+query.replace("*", ".+")+"$"
      var scraps = set.scrapsByQuery[query]
      if (scraps) { return scraps }

      var scraps = []
      for (var name in set.scrapsByName) {
        var isMatch = !!name.match(pattern)
        if (isMatch) {
          scraps.push(set.scrapsByName[name])
        }
      }
      set.scrapsByQuery[query] = scraps
      return scraps
    }

    // This gets bound as setOfMaterials.get in the constructor:
    function get(name) {
      if (this.prefix) {
        name = this.prefix+"-"+name
      }

      var scrap = this.scrapsByName[name]
      if (!scrap) {
        throw new Error("no scraps named "+name)
      }
      return scrap
    }

    SetOfMaterials.prototype.list =
      function() {
        var names = Array.prototype.slice.call(arguments)

        var list = []

        for(var i=0; i<names.length; i++) {
          var name = names[i]
          var hasWildcard = !!name.match(/\*/)

          if (hasWildcard) {
            var matches = getWildcard(this, name)
            list = list.concat(matches)
          } else {
            var scrap = this.get(name)
            list.push(scrap)
          }
        }

        return list
      }

    SetOfMaterials.prototype.setPrefix =function(newPrefix) {
        this.prefix = newPrefix
      }

    SetOfMaterials.prototype.cut =
      function(material, cut, size, options) {
        var name = options.name
        console.log("cutting "+options.name+" from "+material.description)
        if (material.cut && cut != material.cut) {
          throw new Error("trying to cut material the wrong way")
        }

        var constraint = cut == "cross" ? "length" : "width"

        if (material[constraint] < size) {
          throw new Error("Tried to cut "+size+" from "+material.description+" "+constraint+" but the max you can cut is "+material[constraint])
        }

        var scrap = {
          cut: cut,
          slope: options.slope,
          tilt: options.tilt,
          name: name,
          material: material,
          size: size,
          destination: toDestination(options)
        }
        
        if (!name) {
          console.log(scrap)
          throw new Error("every scrap needs a name")
        }

        // scrap[constraint] = size

        // PERSIST
        material[constraint] = material[constraint] - size - 1/8
        material.cut = cut
        material.parts.push(name)
        material.cutLengths.push(size)

        // PERSIST
        this.scrapsByName[name] = scrap

        return scrap

      }

    function toDestination(options) {
      var destination = {}

      ;["xPos", "xSize", "yPos", "ySize", "zPos", "zSize"].forEach(function(key) {
        destination[key] = options[key] || 0
      })

      return destination
    }

    function merge(obj1,obj2){
      var obj3 = {};
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
      return obj3;
    }
    return SetOfMaterials
  }
)


module.exports = library.export(
  "allocate-materials",
  ["set-of-materials", "house-plan"],
  function(SetOfMaterials, HousePlan) {

    function allocateMaterials(plan) {
      var materials = new SetOfMaterials()

      var getHandler = getMaterialHandler.bind(null, materials)

      plan.generate(getHandler)

      return materials
    }

    function getMaterialHandler(materials, name) {

      var helper = helpers[name]

      if (!helper) { return }

      helper = helper.bind(null, materials)

      return helper
    }

    var helpers = {
      section: noop,
      stud: stud,
      plywood: plywood,
      insulation: insulation,
      flooring: flooring,
      door: door,
      trim: trim,
      shade: reflectix,
      sloped: sloped,
      twinWall: twinWall,
      tilted: tilted,
    }

    function noop() {}

    function plywood(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: HousePlan.parts.plywood.THICKNESS,
          maxThickness: 1,
          maxWidth: 48
        }
      )


      if (dimensions.length <= 48) {
        console.log(options)
        throw new Error("We don't need a full length of plywood for this piece")
      }

      if (dimensions.width < 2) {
        throw new Error("Use scrap for plywood pieces < 2in")
      }

      if (dimensions.width > 48) {
        throw new Error("plywood can't be wider than 4ft")
      }

      if (dimensions.length > 96) {
        throw new Error("plywood can't be wider than 8ft")
      }

      var finish = options.sanded ? "sanded" : "rough"

      var description = dimensions.thickness+"in "+finish+" plywood"

      if (dimensions.width == 48) {
        var sheet = materials.reserve(description, "cross", dimensions.length)

        materials.cut(sheet, "cross", dimensions.length, options)

      } else {
        var sheet = materials.reserve(description, "rip", dimensions.width)

        var scrap = materials.cut(sheet, "rip", dimensions.width, options)
      }
    }

    function trim(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: HousePlan.parts.trim.THICKNESS,
          maxThickness: 1.5,  
          maxWidth: 7.5,
        }
      )

      if (dimensions.thickness == 1.5) {
        var description = "8ft 2x"
      } else if (dimensions.thickness == 0.75) {
        var description = "8ft 1x"
      } else {
        throw new Error("no trim pieces "+dimensions.thickness+"in thick")
      }

      var crossCut = true

      if (dimensions.width == 1.5 && dimensions.thickness == 0.75) {
        description = "8ft furring strip"
        crossCut = true

      } else if (dimensions.width > 7.25) {
        throw new Error(dimensions.width+" is too wide!")
      } else if (dimensions.width > 5.5) {
        description = description+"8"
      } else if (dimensions.width > 3.5) {
        description = description+"6"
      } else if (dimensions.width > 2.5) {
        description = description+"4"
      } else if (dimensions.width == 2.5) {
        description = description+"3"
      } else if (!crossCut && dimensions.width > 1.5) {
        description = description+"6"
      } else {
        description = description+"4"
      }

      if (crossCut) {
        var board = materials.reserve(description, "cross", dimensions.length)

        materials.cut(board, "cross", dimensions.length, options)

      } else {

        var board = materials.reserve(description, "rip", dimensions.width)

        materials.cut(board, "rip", dimensions.width, options)

      }

    }

    function door(materials) {
      var options = joinObjects(arguments, 1)

      var door = materials.reserve("door")
      door.parts.push(options.name)
    }

    function stud(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: HousePlan.parts.stud.WIDTH,
          maxThickness: HousePlan.parts.stud.WIDTH,
          maxWidth: HousePlan.parts.stud.DEPTH,
        }
      )

      if (dimensions.length < 5) {
        throw new Error("can't make stud less than 5 inches tall")
      }

      var isTrack = ["down", "up", "down-across", "up-across", "horizontal-south", "horizontal-north"].indexOf(options.orientation) != -1

      var description = isTrack ? "10ft steel track" : "8ft steel stud"

      var steel = materials.reserve(description, "cross", dimensions.length)

      var scrap = materials.cut(steel, "cross", dimensions.length, options)

      if (options.slope) {
        switch(options.orientation) {
          case "north":
            scrap.slopeHint = "sloping down from the web"
            break
          case "south":
            scrap.slopeHint = "sloping up from the web"
            break
          default:
            throw new Error("don't know how to slope a stud with orientation "+options.orientation)
        }
      }

    }

    function twinWall(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: HousePlan.parts.twinWall.THICKNESS,
          maxThickness: 1,
          maxWidth: 48,
        }
      )

      var poly = materials.reserve("twin wall poly", "cross", dimensions.length)

      materials.cut(poly, "cross", dimensions.length, options)

    }

    function insulation(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: HousePlan.parts.stud.DEPTH,
          maxThickness: 4,
          maxWidth: 18,
        }
      )

      var fiberglass = materials.reserve("fiberglass insulation", "cross", dimensions.length)

      materials.cut(fiberglass, "cross", dimensions.length, options)

    }

    function reflectix(materials) {
      var options = joinObjects(arguments, 1)

      var dimensions = lumberDimensions(
        options,
        {
          defaultThickness: 0.5,
          maxThickness: 0.5,
          maxWidth: 48,
        }
      )

      var shade = materials.reserve("reflectix roll", "cross", dimensions.length)

      materials.cut(shade, "cross", dimensions.length, options)

    }


    function flooring(materials) {
      var options = joinObjects(arguments, 1)

      var area = options.xSize/12 * options.zSize/12

      var description = "vinyl flooring"

      materials.reserveBulk(description, area, options.name)
    }

    function sloped(materials) {
      var options = joinObjects(arguments, 1)
      options.part(options)
    }

    function tilted(materials) {
      var options = joinObjects(arguments, 1)

      if (!options.zSize) {
        console.log("offending part:", options)
        throw new Error("can't tilt a part without a zSize")
      }

      var rise = options.tilt * options.zSize

      var newZSize = Math.sqrt(
        Math.pow(options.zSize, 2) + Math.pow(rise, 2)
      )

      var builder = options.part

      options = merge(
        options,
        {zSize: newZSize}
      )

      builder(options)
    }

    function joinObjects(iterable, start) {
      var joined = {}

      for(var i = start||0; i<iterable.length; i++) {
        for(var key in iterable[i]) {
          joined[key] = iterable[i][key]
        }
      }

      return joined
    }

    function merge(obj1,obj2){
      var obj3 = {};
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
      return obj3;
    }
    


    /** TESTS ******/
    var options = {
      defaultThickness: 0.5,
      maxThickness: 0.9,
      maxWidth: 48,
    }
    var dim = lumberDimensions({
      ySize: 48, zSize: 60
    }, options)
    if (dim.thickness != 0.5 || dim.width != 48 || dim.length != 60) { th() }

    dim = lumberDimensions({
      xSize: 65, ySize: 0.9, zSize: 38
    }, options)
    if (dim.thickness != 0.9 || dim.width != 38 || dim.length != 65) { th() }

    function th() {
      throw new Error("lumberDimensions is not working")
    }
    /****************/



    function lumberDimensions(shape, options) {

      if (Number.isNaN(shape.xSize)) {
        throw new Error("xSize is NaN")
      }
      if (Number.isNaN(shape.ySize)) {
        throw new Error("ySize is NaN")
      }
      if (Number.isNaN(shape.zSize)) {
        throw new Error("zSize is NaN")
      }

      var xSize = Math.abs(shape.xSize || options.defaultThickness)
      var ySize = Math.abs(shape.ySize || options.defaultThickness)
      var zSize = Math.abs(shape.zSize || options.defaultThickness)

      var minDimension = Math.min(xSize, ySize, zSize)

      // Hardcoded here for ripping the 1in shade rails 
      if (minDimension == 1) {
        minDimension = 1.5
      }

      if (xSize == minDimension) {
        var thicknessDimension = "x"
      } else if (ySize == minDimension) {
        var thicknessDimension = "y"
      } else if (zSize == minDimension) {
        var thicknessDimension = "z"
      }

      switch(thicknessDimension) {
        case "x":
          var thickness = xSize
          if (ySize <= options.maxWidth) {
            var width = ySize
            var length = zSize
          } else {
            var length = ySize
            var width = zSize
          }
          break
        case "y":
          var thickness = ySize
          if (xSize <= options.maxWidth) {
            var width = xSize
            var length = zSize
          } else {
            var length = xSize
            var width = zSize
          }
          break
        case "z":
          var thickness = zSize
          if (xSize <= options.maxWidth) {
            var width = xSize
            var length = ySize
          } else {
            var length = xSize
            var width = ySize
          }            
          break
      }

      if (typeof thickness == "undefined") {
        throw new Error("no thickness")
      }

      return {
        length: length,
        width: width,
        thickness: thickness
      }
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

    return allocateMaterials
  }
)