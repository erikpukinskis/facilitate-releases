module.exports = function() {

  function Steps() {
    this.generators = []
    this.descriptions = []
  }

  Steps.prototype.add = function(description, generator) {
    this.descriptions.push(description)
    this.generators.push(generator)
  }

  Steps.prototype.play = function(handlers) {

    for(var i=0; i<this.generators.length; i++) {
      var generator = this.generators[i]
      var description = this.descriptions[i]

      if (generator) {
        var outputs = runGenerator(generator, handlers)
      } else {
        var outputs = []
      }

      var stepHandler = handlers.step
      if (!stepHandler) {
        throw new Error("When you play steps you need a step handler. Try steps.play({step: function(description, results) { console.log(description+\" is done.\")")
      }
      stepHandler(description, outputs)

    }
  }

  function runGenerator(generator, handlers) {
    var names = argNames(generator)
    var outputs = []
    var args = names.map(toHandler)

    generator.apply(null, args)
    
    function toHandler(name) {
      var handler = handlers[name]
      if (!handler) {
        console.log("generator:", generator)
        throw new Error("A step generator used a "+name+" command, but you didn't provide a handler for it. Try steps.play({"+name+": function(some, args) { return \"some result\" })")
      }

      return captureOutput.bind(handler)
    }

    function captureOutput() {
      var output = this.apply(null, arguments)
      outputs.push(output)
      return output
    }

    return outputs
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

  return Steps
}()