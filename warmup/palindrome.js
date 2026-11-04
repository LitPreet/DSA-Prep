let num = 1228

function isPalindrome(n){
    let reverse = 0
    let orig = n
      while(n>0){
       remainder = n % 10;
       reverse = reverse * 10 + remainder
       n = Math.floor(n/10)
      }
      if(reverse == orig) return true
      return false
}
console.log(isPalindrome(num))

// reverse Integer

function reverseInteger(n){
    let reverse = 0
      while(n>0){
       remainder = n % 10;
       reverse = reverse * 10 + remainder
       n = Math.floor(n/10)
      }
      return reverse
}
console.log(reverseInteger(num))