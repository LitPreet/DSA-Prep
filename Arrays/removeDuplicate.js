let nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
// two pointer problem, in place and non decreasing order
// whi chnage krna h duplicates ho skte h

function removeDuplicate(nums) {
 if (nums.length === 0) return [];
  let x = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > nums[x]) {
      x = x + 1;
      nums[x] = nums[i];
    }
  }
  return nums
}
console.log(removeDuplicate(nums));
