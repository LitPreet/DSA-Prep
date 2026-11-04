let n = [0,1,2,2,3,0,4,2]
let val = 2

function removeElement(n){
let x = 0;
for(let i = 0; i<n.length; i++){
    if(n[i] !== val){
        n[x] = n[i];
        x = x+1
    }
    console.log(n)
}
return x
}

console.log(removeElement(n))