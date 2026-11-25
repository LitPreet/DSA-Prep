/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var threeSum = function(nums) {
    nums.sort((a,b) => a-b)
    let ans = []
    let n = nums.length;
    for(let i = 0; i<n; i++){
      if(nums[i] != nums[i-1]){
        twoSum(nums, i, ans)
      }
    }
    return ans
};

var twoSum = function(arr, x, ans){
    let i = x+1;
    let j = arr.length - 1;
    while(i<j){
        let sum = arr[i] + arr[j] + arr[x]
        if(sum > 0){
          --j;
        }else if(sum<0){
            ++i;
        } else{
            ans.push([arr[i], arr[j], arr[x]])
            ++i, --j;
           while(i < j && arr[i] === arr[i-1]) {
    i++;
}
        }
    }
}