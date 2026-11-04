let arr = [4, 8, 0, 3, 2, 1, 5, 8];
let largest = -Infinity;
let secondLargest = -Infinity

function findSecondLargest(arr){
    if(arr.length < 2){
        return "Array should have at least more than 2 element"
    }
     for(let i = 0; i<arr.length; i++){
        if(arr[i] > largest){
            secondLargest = largest
            largest = arr[i]
        } else if(arr[i] > secondLargest && arr[i] !== largest){ // condition handle for duplicate
            secondLargest = arr[i]
        }
     }
     return secondLargest;
}

console.log(findSecondLargest(arr))

