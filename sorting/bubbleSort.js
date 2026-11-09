let arr = [5, 4, 9, 15, 9, 7, 0, 1];

function BubbleSort(arr) {
  let n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let isSwaped = false;
    for (let j = 0; j < n - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        isSwaped = true;
      }
    }
    if(!isSwaped) break;
  }
  return arr
}

console.log(BubbleSort(arr));
