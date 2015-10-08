"use strict";

// input: Object { temp_init: 1000, temp_min: 0.001, damp_factor: 1.02, k: 1, iters_for_each_t: 200, points: [x:5, y:6...]}

// output: { iters: [], sol: [0,3,5,6,7,9] }


// iters: [{best_energy: 123, energy: 125, evals: 201, iter: 0, pos: [0,3,5,7,6,9], temp: 1000}


function tempDown(tempNow, dampFactor) {
  return tempNow * (1.0 / dampFactor)
  
}

function shouldAcceptNew(oldVal, newVal, points, cost, temp, k) {
  let p = Math.exp(- Math.abs(cost(points, newVal) - cost(points, oldVal))/(k * temp))
  return Math.random() < p
}


function nextSolution(sol) {
  sol = sol.slice() // copy
  let r = Math.trunc(Math.random() * (sol.length - 1))
  let temp = sol[r]
  sol[r] = sol[r + 1]
  sol[r + 1] = temp
  return sol
}


function costFunction(points, sol) {
  let euclidDist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  let sum = 0.0
  for(var i = 0; i < sol.length - 1; i++) {
    sum += euclidDist(points[sol[i]], points[sol[i + 1]])
  }
  sum += euclidDist(points[sol[0]], points[sol[sol.length - 1]])
  // console.log(sum)
  return sum
}

function parseAndRun(data) {
  let best = []
  for(var i = 0; data.points.length > i; i++) {
    best.push(i)
  }

  let bestbest = best.slice()

  console.log(data)
  let bestHistory = []

  let eps = 0.000001

  let iter = 0;

  for(var tempNow = data['temp_init']; tempNow - data['temp_min'] > eps; tempNow = tempDown(tempNow, data['damp_factor'])) {
    for(var it = 0; data['iters_for_each_t'] > it; it++) {

      let nextSol = nextSolution(best)
      if(costFunction(data.points, nextSol) < costFunction(data.points, best)
        || shouldAcceptNew(best, nextSol, data.points, costFunction, tempNow, data.k)) best = nextSol

      if(costFunction(data.points, bestbest) > costFunction(data.points, best)) bestbest = best

    }
    bestHistory.push({ energy: costFunction(data.points, best), pos: best.slice(), iter, temp: tempNow, evals: iter * data['iters_for_each_t']})
    iter++
  }
  let bestEnergy = costFunction(data.points, bestbest)
  let output = {};
  output.iters = bestHistory.map((one) => Object.assign({}, one, {best_energy: bestEnergy}))
  output.sol = bestbest.slice()
  return output
}




onmessage = (e) => {
  let res = parseAndRun(e.data)
  postMessage(res)
}
