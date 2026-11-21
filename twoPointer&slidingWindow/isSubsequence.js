let s = "abc"
let t = "achbgcd"
function isSubsequence(s, t) {
    let i = 0;
    let j = 0;
    while(j<t.length){
        if(s[i] == t[j]){
            ++i;
        }
        ++j;
    }
    return i === s.length
};

isSubsequence(s,t)