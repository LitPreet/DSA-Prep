function factorial(n){
if(n == 0) return 1
return n * factorial(n-1)
}
console.log(factorial(5))


// power of two 
function isPowerOfTwo(n){
if(n == 1) return true
if((n<1) || (n%2 != 0)) return false
return isPowerOfTwo(n/2)
}

console.log(isPowerOfTwo(16))