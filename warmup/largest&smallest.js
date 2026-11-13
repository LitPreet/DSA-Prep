// let arr = [4, 8, 2, 15, 6,20];

// let largest = -Infinity
// for(let i = 0; i<arr.length; i++){
//     if(arr[i]>largest){
//         largest = arr[i]
//     }
// }

// console.log(largest)


// let smalles = Infinity
// for(let i = 0; i<arr.length; i++){
//     if(arr[i]<smalles){
//         smalles = arr[i]
//     }
// }

// console.log(smalles)


// let arr2 = [1, 2, 3, 4, 5] 
// let start = 0
// let end = arr2.length-1;

// while(start<=end){
//     let temp = arr2[start]
//     arr2[start] = arr2[end]
//     arr2[end] = temp
//     start++;
//     end--
// }
// console.log(arr2)


// move all zeors to end 
// let arr = [0, 1, 0, 3, 12];

// let x = 0
// for(let i = 0; i<arr.length; i++){
//     if(arr[i] != 0){
//         arr[x] = arr[i]
//         x++;
//     }
// }
// for(let i = x; i<arr.length; i++){
//     arr[i] = 0
// }

// console.log(arr)


// let arr = [1, 1, 2, 2, 3, 3, 4, 5, 5];
// function removeDuplicate(arr){
// let x = 0;
//  if (arr.length === 0) return [];
// for(let i = 1; i<arr.length; i++){
//     if(arr[i] > arr[x]){
//        x = x+1
//        arr[x] = arr[i]
//     }
// }
// return arr.slice(0,x+1)
// }
// console.log(removeDuplicate(arr))


let arr = [2, -3, 0, 5, -1, 0]
let pos = 0
let neg = 0

for(let i = 0; i<arr.length-1; i++){
    if(arr[i]<0){
        neg++
    }
    else {
        pos++
    }
}
console.log(neg, pos)

function secondLagest(arr){
    let largest = -Infinity
    let secondLagest = -Infinity

    for(let i = 0; i<arr.length; i++){
        if(arr[i]>largest){
            secondLagest = largest
            largest = arr[i]
        }else if(arr[i] > secondLagest && arr[i] !== largest){
            secondLagest = arr[i]
        }
    }
return [largest, secondLagest]
}



console.log(secondLagest(arr))


let d  = [1, 2, 4, 5, 6]
let n = d.length
let sum = n*(n+1)/2
let partialSum = 0;

for(let i = 0; i<n; i++){
    partialSum += d[i]
}
console.log(sum-partialSum)

// ===== EASY: Check if array is sorted (non-decreasing) =====
// Compare each element with the previous one. O(n) time, O(1) space.
function isSorted(nums) {
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < nums[i - 1]) return false
    }
    return true
}
console.log(isSorted([1, 2, 2, 5, 9])) // true
console.log(isSorted([3, 1, 4]))       // false


// ===== EASY: Rotate array right by k steps =====
// Reverse whole array, then reverse first k, then reverse the rest. O(n) time, O(1) space.
function rotateRight(nums, k) {
    k = k % nums.length
    const reverse = (l, r) => {
        while (l < r) {
            [nums[l], nums[r]] = [nums[r], nums[l]]
            l++
            r--
        }
    }
    reverse(0, nums.length - 1)
    reverse(0, k - 1)
    reverse(k, nums.length - 1)
    return nums
}
console.log(rotateRight([1, 2, 3, 4, 5, 6, 7], 3)) // [5, 6, 7, 1, 2, 3, 4]


// ===== EASY: Two Sum (return indices of two numbers adding to target) =====
// Store seen values in a map; for each num check if (target - num) was seen. O(n) time, O(n) space.
function twoSum(nums, target) {
    const seen = new Map()
    for (let i = 0; i < nums.length; i++) {
        const need = target - nums[i]
        if (seen.has(need)) return [seen.get(need), i]
        seen.set(nums[i], i)
    }
    return []
}
console.log(twoSum([2, 7, 11, 15], 9)) // [0, 1]


// ===== MEDIUM: Maximum Subarray Sum (Kadane's Algorithm) =====
// Keep a running sum; if it drops below the current element, start fresh from it. O(n) time, O(1) space.
function maxSubArray(nums) {
    let current = nums[0]
    let best = nums[0]
    for (let i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i])
        best = Math.max(best, current)
    }
    return best
}
console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])) // 6  -> [4, -1, 2, 1]


// ===== MEDIUM: Best Time to Buy and Sell Stock (one transaction) =====
// Track the lowest price so far; profit = today's price - lowest. O(n) time, O(1) space.
function maxProfit(prices) {
    let minPrice = Infinity
    let profit = 0
    for (let i = 0; i < prices.length; i++) {
        minPrice = Math.min(minPrice, prices[i])
        profit = Math.max(profit, prices[i] - minPrice)
    }
    return profit
}
console.log(maxProfit([7, 1, 5, 3, 6, 4])) // 5  (buy at 1, sell at 6)


// ===== MEDIUM: Majority Element (appears more than n/2 times) =====
// Boyer-Moore voting: same element -> count++, different -> count--, count 0 -> pick new candidate.
// O(n) time, O(1) space.
function majorityElement(nums) {
    let candidate = null
    let count = 0
    for (let i = 0; i < nums.length; i++) {
        if (count === 0) candidate = nums[i]
        count += nums[i] === candidate ? 1 : -1
    }
    return candidate
}
console.log(majorityElement([2, 2, 1, 1, 1, 2, 2])) // 2


// ===== MEDIUM: Product of Array Except Self (no division) =====
// Pass 1: result[i] = product of everything to the left.
// Pass 2: multiply by running product of everything to the right. O(n) time, O(1) extra space.
function productExceptSelf(nums) {
    const result = new Array(nums.length).fill(1)
    let left = 1
    for (let i = 0; i < nums.length; i++) {
        result[i] = left
        left *= nums[i]
    }
    let right = 1
    for (let i = nums.length - 1; i >= 0; i--) {
        result[i] *= right
        right *= nums[i]
    }
    return result
}
console.log(productExceptSelf([1, 2, 3, 4])) // [24, 12, 8, 6]
