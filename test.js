var diff = require('./').diff

console.log(
diff([
  1,
  2,
  3,
  4,
  5
], [
  1,
  5,
  2,
  3,
  4
],
(a, b) => ({a, b}))
)
