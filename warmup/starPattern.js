// ****
// ****
// ****
// ****


// let n = 4;
// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let j = 0; j<n; j++){
//       row = row + "*"
//     }
//     console.log(row)
// }


// *
// **
// ***
// ****

let n = 6
// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let j = 0; j<=i; j++){
//       row = row + "*"
//     }
//     console.log(row)
// }


// 1
// 1 2
// 1 2 3
// 1 2 3 4
// 1 2 3 4 5

// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let j = 1; j<=i; j++){
//       row = row + j
//     }
//     console.log(row)
// }

// 1
// 22
// 333
// 4444
// 55555

// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let j = 1; j<=i; j++){
//       row = row + i
//     }
//     console.log(row)
// }


// 12345
// 1234
// 123
// 12
// 1

// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let j = 0; j < n-i; j++){
//       row = row + (j+1)
//     }
//     console.log(row)
// }


// for(let i = 0; i<n; i++){
//     let row = ""
//     for(let k = 0; k<n-(i+1); k++){
//         row = row + " "
//     }
//     for(let j = 1; j<=i; j++){
//       row = row + "*"
//     }
//     console.log(row)
// }


for(let i = 0; i<n; i++){
    let row = ""
    let toggle = 1;
    for(let j = 1; j<=i; j++){
      row = row + toggle;
      if(toggle === 1){
        toggle = 0
      }
      else {
        toggle = 1
      }
    }
    console.log(row)
}
