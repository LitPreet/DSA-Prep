// LeetCode 3: Longest Substring Without Repeating Characters
// Given a string s, find the length of the longest substring without repeating characters.
// Example: "abcabcbb" -> 3 ("abc")
//
// Approach: variable-size sliding window.
// Expand the window with `r`. If s[r] was already seen inside the window,
// jump `l` past its last position. Track the max window size.
// Time: O(n), Space: O(min(n, charset))

let s = "abcabcbb"
function lengthOfLongestSubstring(s) {
    let lastSeen = new Map();
    let l = 0;
    let maxLen = 0;

    for(let r = 0; r < s.length; r++){
        let ch = s[r];
        if(lastSeen.has(ch) && lastSeen.get(ch) >= l){
            l = lastSeen.get(ch) + 1;
        }
        lastSeen.set(ch, r);
        maxLen = Math.max(maxLen, r - l + 1);
    }
    return maxLen
};

console.log(lengthOfLongestSubstring(s))          // 3
console.log(lengthOfLongestSubstring("bbbbb"))    // 1
console.log(lengthOfLongestSubstring("pwwkew"))   // 3
console.log(lengthOfLongestSubstring("abba"))     // 2
console.log(lengthOfLongestSubstring(""))         // 0
