// print n to 1 using recusrion

// function print(n) {
//   if (n < 1) return;
//   console.log(n);
//   print(--n);
// }
n = 10;

// print(10);

// priint 1 to n 
// function print(x){
// if(x>n)return
// console.log(x)
// print(++x)
// }
// print(1)

let sum = 0
// print sum of first n numbers 
function sumofN(n){
if(n==0) return 0;
return n+sumofN(n-1)
}
console.log(sumofN(5))

let arr = [5,3,0,2,1];
function sumArr(n){
if(n === 0) return arr[0]
return arr[n] + sumArr(n-1)
}
console.log(sumArr(arr.length-1))

// now only odd number sum 
function sumOddElem(n){
let isOdd = arr[n]%2 != 0    
if(n === 0) {
    if(isOdd) return arr[n]
    return arr[0]
}
return (isOdd ? arr[n] : 0) + sumOddElem(n-1)
}
console.log(sumOddElem(arr.length-1))