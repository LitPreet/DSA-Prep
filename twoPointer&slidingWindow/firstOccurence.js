let haystack = "saturdayshsad"
let needle = "sad"
function firstOcc(haystack, needle) {
    let h = haystack.length;
    let n = needle.length;

    for(let i = 0; i<= h-n; i++){
        let j = 0;

        for(j = 0; j<n; j++){
            if(haystack[i+j] != needle[j]){
                break;
            }
        }
        if(j == n){
            return i
        }
    }
    return -1
};

console.log(firstOcc(haystack, needle))