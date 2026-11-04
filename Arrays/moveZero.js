let nums = [0,1,0,3,12]
// output -[1,3,12,0,0]
// two pointer approach 
 
let x = 0; // for position
for(let i = 0; i<nums.length; i++){
    if(nums[i] !== 0){
        nums[x] = nums[i]
        x++;
    }
}

for(let i = x; i<nums.length; i++){
    nums[i] = 0
}

console.log(nums)
