class DiffEdit {
  constructor (type, oldLine, newLine) {
    this.type = type
    this.oldLine = oldLine
    this.newLine = newLine
  }
}

class Slice {
  constructor (aLow, aHigh, bLow, bHigh) {
    this.aLow = aLow
    this.aHigh = aHigh
    this.bLow = bLow
    this.bHigh = bHigh
  }

  notEmpty () {
    return this.aLow < this.aHigh && this.bLow < this.bHigh
  }
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
    if (val) return val

    return this.set(key, [0, 0, null, null])
  }

  set (key, value) {
    return this.state[key] = value
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
    if (!match) return this.fallbackDiff(slice)

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

      lines = lines.concat(head, this.diff(subslice), tail)
      if (!match) return lines

      aLine = match.aLine + 1
      bLine = match.bLine + 1
      match = match.next
    }
  }

  fallbackDiff (slice) {
    return this.fallback.diff(
      this.a.slice(slice.aLow, slice.aHigh),
      this.b.slice(slice.bLow, slice.bHigh)
    )
  }

  uniqueMatchingLines (slice) {
    var counts = new Hashmap()

    for (let n = slice.aLow; n < slice.aHigh; n++) {
      let value = this.a[n]
      let count = counts.get(value)
      count[0] = count[0] + 1
      count[2] = count[2] || n
    }

    for (let n = slice.bLow; n < slice.bHigh; n++) {
      let value = this.b[n]
      let count = counts.get(value)
      count[1] = count[1] + 1
      count[3] = count[3] || n
    }

    var _counts = []
    Object.keys(counts.state).forEach((value) => {
      var count = counts.get(value)
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
      this.a[slice.aLow] === this.b[slice.bLow]) {
      var edit = new DiffEdit('equal', this.a[slice.aLow], this.b[slice.bLow])
      cb(edit)
      slice.aLow += 1
      slice.bLow += 1
    }
  }

  matchTail (slice, cb) {
    while (slice.length &&
      this.a[slice.aHigh - 1] === this.b[slice.bHigh - 1]) {
      slice.aHigh += 1
      slice.bHigh += 1
      var edit = new DiffEdit('equal', this.a[slice.aHigh], this.b[slice.bHigh])
      cb(edit)
    }
  }
}

function patienceSort (matches) {
  var stacks = []
  matches.forEach(match => {
    var i = binarySearch(stacks, match)
    if (i >= 0) match.prev = stacks[i]
    stacks[i + 1] = match
  })

  var match = stacks[stacks.length - 1]
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
    let mid = Math.floor((low + high) / 2)
    if (stacks[mid].bLine < match.bLine) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}
