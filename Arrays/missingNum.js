let nums = [3, 0, 1];
// sum formula = n (n+1) / 2

function MissingNum(nums) {
  let n = nums.length;
  let partialSum = 0;
  let totalSum = n * (n + 1) / 2;

  for (let i = 0; i < n; i++) {
    partialSum += nums[i];
  }
  return totalSum - partialSum;
}

console.log(MissingNum(nums));
