// Function to implement insertion sort
function selectionSort(arr) {

    // Getting the array length 
    let n = arr.length;
    
    // To store value temporarily
    let key;
    
    // For iterations
    let i, j;
    
    // Iterate array in forward direction
    for (i = 0; i < n ; ++i) {
        key = arr[i];
        j = i - 1;
        
        // Iterate and swap elements in backward direction
        // till number is greater then the key
        for (j; j >= 0, arr[j]>key; --j){
            arr[j+1]=arr[j];
        }
        // Swap the key to right position
        arr[j+1]=key;
    }
}

// Input array
const arr = [64, 25, 12, 22, 11];

// Display Input array
console.log("Original array: " + arr);

// Sort using function 
selectionSort(arr);

// Display the output array after sorting
console.log("After sorting: " + arr);