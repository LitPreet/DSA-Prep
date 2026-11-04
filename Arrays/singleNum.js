let nums = [2,2,5]
// output = 1
// brute force
// let hash = {}
// for(let i = 0; i<nums.length; i++){
//     if(!hash[nums[i]]){
//         hash[nums[i]] = 1
//     } else {
//         hash[nums[i]]++;
//     }
// }
// for(let i = 0; i<nums.length; i++){
//     if(hash[nums[i]] === 1){
//         console.log(nums[i])
//     }
// }
// console.log(hash)



// now with bitwise xor
let xor = 0
for(let i = 0; i<nums.length; i++){
  xor = xor ^ nums[i]
}
console.log(xor)