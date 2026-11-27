var hasCycle = function(head) {
  const seen = new Set();
  let curr = head;
  while (curr) {
    if (seen.has(curr)) return true;
    seen.add(curr);
    curr = curr.next;
  }
  return false;
};

var hasCycle = function (head){
    // floyd algo 
    if(!head) return false
    let slow = head;
    let fast = head.next;
    while(slow != fast){
        if(fast == null || fast.next == null) return false
        slow = slow.next;
        fast = fast.next.next;
    }
    return true
}; 