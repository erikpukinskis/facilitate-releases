module.exports = dasherize

function dasherize(camelCase) {
  var word = null
  var words = []
  var wordStarted = false

  for(var i=0; i<camelCase.length; i++) {
    var char = camelCase[i]
    var upper = char.toUpperCase()
    var lower = char.toLowerCase()
    var isLetter = upper != lower
    var isNumber = !Number.isNaN(parseFloat(char))
    var isAlphaNumeric = isLetter || isNumber
    if (isNumber) {
      var isUpper = false
      var isLower = true
    } else if (isLetter) {
      var isUpper = (char == upper)
      var isLower = !isUpper
    } else {
      var isUpper = false
      var isLower = false
    }
    if (isUpper && !word) {
      word = char.toLowerCase()
    } else if (isUpper) {
      words.push(word)
      word = char.toLowerCase()
    } else if (isLower && !word && isNumber && words.length < 1) {
      // do nothing, can't start with a number
    } else if (isLower && !word) {
      word = char
    } else if (isLower && word) {
      word = word + char
    } else if (!isAlphaNumeric && word) {
      words.push(word)
      word = undefined
    }
  }

  if (word != undefined) {
    words.push(word)
  }

  var dashed = words.join("-")

  return dashed
}
