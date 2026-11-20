let nums = [2,7,11,15], target = 26

let map = {}
let n = nums.length;
for(let i = 0; i<n; i++){
map[nums[i]] = i
}

for(let i = 0; i<n; i++){
    let pairDiff = target - nums[i];
    if(map[pairDiff] && map[pairDiff] != i){
        console.log([i, map[pairDiff]])
    }
}
console.log(map)