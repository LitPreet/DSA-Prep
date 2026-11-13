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
