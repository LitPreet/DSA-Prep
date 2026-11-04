let prices = [7,1,5,3,6,4];


// brute force 
// const buyAndSell = (prices) => {
//     let maxProfit = 0;
//     for(let i = 0; i<prices.length; i++){
//         for(let j = i+1; j<prices.length; j++){
//          if(prices[j] - prices[i] > maxProfit){
//             maxProfit = prices[j] - prices[i]
//          }
//         }
//     }
//     return maxProfit

// }
// console.log(buyAndSell(prices))

// O(n2)

// now optimised one



const buyAndSell = (prices) => {
    if(prices.length < 2) return 0
    let minPrice = prices[0]
    let maxProfit = 0;
    for(let i = 0; i<prices.length; i++){
        if(prices[i] < minPrice){
            minPrice = prices[i]
        }else{
            maxProfit = Math.max(maxProfit, prices[i] - minPrice)
        }
    }
    return maxProfit

}
console.log(buyAndSell(prices))

O(n)
0(1)