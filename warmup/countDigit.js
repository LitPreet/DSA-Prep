let num = -567344;
let count = 0;

// divide remove the last digit
// modulo give the remainder
function countDigit(num) {
  if (num === 0) return 0;
  if (num < 0) num = Math.abs(num);
  while (num > 0) {
    num = Math.floor(num / 10);
    count++;
  }
  return count;
}

console.log(countDigit(num));
