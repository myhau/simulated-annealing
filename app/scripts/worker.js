"use strict";

const Rx = require("rx");
const Observable = Rx.Observable;

function parseAndRun(data) {

}

onmessage = (e) => {
  let res = parseAndRun(e.data)
  postMessage(res)
}


