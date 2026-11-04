let s = ["h", "e", "l", "l", "o"];

function reverseStr(s) {
  let n = s.length;
  let halfLen = Math.floor(n / 2);

  for (let i = 0; i < halfLen; i++) {
    let temp = s[i];
    s[i] = s[n - 1 - i];
    s[n - 1 - i] = temp;
  }
  return s;
}
console.log(reverseStr(s));
