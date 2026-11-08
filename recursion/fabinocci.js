function fibo(n){
if(n<=1) return n
return fibo(n-1)+fibo(n-2)
}
// time complexity - O(2^n) which is bad but will improve when we do DP
console.log(fibo(5))