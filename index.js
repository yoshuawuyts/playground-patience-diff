class Slice {
  constructor (aLow, aHigh, bLow, bHigh) {
    this.aLow = aLow
    this.aHigh = aHigh
    this.bLow = bLow
    this.bHigh = bHigh
  }

  aRange () {
    return [this.aLow, this.aHigh]
  }

  bRange () {
    return [this.bLow, this.bHigh]
  }

  notEmpty () {
    return this.aLow < this.aHigh && this.bLow < this.bHigh
  }
}

class Match {
  constructor (aLine, bLine) {
    this.aLine = aLine
    this.bLine = bLine
    this.prev = null
    this.next = null
  }
}

module.exports = class Patience {
  static diff (a, b, fallback) {
    var slice = new Slice(0, a.length, 0, b.length)
    var patience = new Patience(fallback, a, b)
    return patience.diff(slice)
  }

  constructor (fallback, a, b) {
    this.fallback = fallback
    this.a = a
    this.b = b
  }

  diff (slice) {
    var match = patienceSort(this.uniqueMatchingLines(slice))
    if (!match) return fallback(slice)

    var lines = []
    var aLine = slice.aLow
    var bLine = slice.bLow

    var aNext, bNext

    while (true) {
      if (match) {
        aNext = match.aLine
        bNext = match.bLine
      } else {
        aNext = slice.aHigh
        bNext = slice.bHigh
      }

      var subslice = new Slice(aLine, aNext, bLine, bNext)
      var head = []
      var tail = []

      this.matchHead(subslice, (edit) => { head = head.concat(edit) })
      this.matchTail(subslice, (edit) => { tail = [edit].concat(tail) })

      lines.concat(head, this.diff(subslice), tail)
      if (!match) return lines
    }
  }

  uniqueMatchingLines (slice) {
    var counts = new Hashmap()

    for (let n = slice.aRange[0]; n < slice.aRange[1]; n++) {
      let text = this.a[n].text
      let count = counts.get(text)
      count[0] = count[0] + 1
      count[2] = count[2] || n
    }

    for (let n = slice.bRange[0]; n < slice.bRange[1]; n++) {
      let text = this.a[n].text
      let count = counts.get(text)
      count[0] = count[0] + 1
      count[2] = count[2] || n
    }

    var _counts = []
    Object.keys(counts.state).forEach((text) => {
      var count = counts.get(text)
      if (count[0] === 1 && count[1] === 1) {
        _counts.push(count)
      }
    })

    counts = _counts // remap
    return counts.map(count => {
      var aLine = count[2]
      var bLine = count[3]
      return new Match(aLine, bLine)
    })
  }

  matchHead (slice, cb) {
    while (slice.length &&
      this.a[slice.aLow].text === this.b[slice.bLow].text) {
      var edit = new DiffEdit('equal', this.a[slice.aLow], this.b[slice.bLow])
      cb(edit)
      slice.aLow += 1
      slice.bLow += 1
    }
  }

  matchTail (slice, cb) {
    while (slice.length &&
      this.a[slice.aHigh - 1].text === this.b[slice.bHigh - 1].text) {
      slice.aHigh += 1
      slice.bHigh += 1
      var edit = new DiffEdit('equal', this.a[slice.aHigh], this.b[slice.bHigh])
      cb(edit)
    }
  }
}

class DiffEdit {
  constructor (type, oldLine, newLine) {
    this.type = type
    this.oldLine = oldLine
    this.newLine = newLine
  }
}

function patienceSort (matches) {
  var stacks = []
  matches.forEach(match => {
    var i = binarySearch(stacks, match)
    if (i >= 0) match.prev = stacks[i]
    stacks[i + 1] = match
  })

  var match = stacks.last
  if (!match) return null

  while (match.prev) {
    match.prev.next = match
    match = match.prev
  }

  return match
}

function binarySearch (stacks, match) {
  var low = -1
  var high = stacks.length

  while (low + 1 < high) {
    let mid = (low + high) / 2
    if (stacks[mid].bLine < match.bLine) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}

function fallback () {
  throw new Error('falling back, uh oh')
}

// JavaScript doesn't have a hash map like Ruby does,
// we want to create fancy values when we insert a key.
// This is some custom code we had to port.
class Hashmap {
  constructor () {
    this.state = {}
  }

  get (key) {
    var val = this.state[key]
    if (!val) {
      this.set(key)
      val = this.state[key]
    }
    return val
  }

  set (key) {
    this.state[key] = [0, 0, null, null]
  }
}
