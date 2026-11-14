function findMin(arr) {
    let res = arr[0];

	// Traverse over arr[] to find minimum element
    for (let i = 1; i < arr.length; i++) {
        res = Math.min(res, arr[i]);
    }

    return res;
}

// Driver code
const arr = [5, 6, 1, 2, 3, 4];
console.log(findMin(arr));
