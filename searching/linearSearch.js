let arr = [5, 4, 0, 2, 1];
function linearSear(arr, tar) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === tar) {
      return i;
    }
  }
  return -1;
}
console.log(linearSear(arr, 0));
