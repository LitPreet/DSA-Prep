/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {boolean}
 */
var isPalindrome = function(head) {
    if (!head || !head.next) return true;
     
     //find the middle using slow and fast pointer
     let slow = head;
     let fast = head;
     while(fast && fast.next){
        slow = slow.next;
        fast = fast.next.next
     }

     // reverse the second half using slow as middle
     let prev = null
     let curr = slow
     
     while(curr){
        let temp = curr.next;
        curr.next = prev;
        prev = curr
        curr = temp
     }

     // compare 
     let left = head;
     let right = prev
      
      while(right){
        if(left.val != right.val) return false
        left = left.next;
        right = right.next
      }
      return true

};