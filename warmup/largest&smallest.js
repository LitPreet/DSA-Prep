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
        }else if(arr[i] > secondLagest){
            secondLagest = arr[i]
        }
    }
return [largest, secondLagest]
}

console.log(secondLagest(arr))