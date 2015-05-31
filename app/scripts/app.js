"use strict";

let d3 = require("d3");
var Rx = require("rx-dom");
let I = require("immutable");

let from = Rx.Observable.from,
    fromEvent = Rx.Observable.fromEvent,
    fromPromise = Rx.Observable.fromPromise;


let serverName = "http://localhost:8089/";

let paramNames =
    ["temp_init", "temp_min", "damp_factor", "k", "iters_for_each", "n_tries"];

function getSimulatedData(params) {
    return fromPromise($.ajax({
        url: serverName,
        data: JSON.stringify(params),
        contentType: "application/json",
        crossDomain: true,
        method: "POST",
        accepts: "json"
    }));
    //return fromPromise(ajaxPromise);
}

let pointsSource =
    from([[{x: 1, y:5}, {x: 7, y: 20}, {x: 21, y:50}]]);

let above2PointsSource = pointsSource.filter(points => points.length > 2);

function validateSaParams() {
    return true;
}

function fromSerializedToObject(arr) {
    let res = {};
    arr.forEach(({name, value}) => { res[name] = parseFloat(value) });
    return res;
}

let [formSource, badFormSource] =
    fromEvent($("#sa-params"), "submit")
        .map(e => { e.preventDefault(); return fromSerializedToObject($(e.target).serializeArray()) })
        .partition(validateSaParams);

badFormSource.subscribe(x=>console.log("BAD FORM BRO REPAIR IT"));

let saParamsSource = formSource.withLatestFrom(above2PointsSource, (formData, points) => Object.assign({}, formData, {"points":points}));

let saOutputSource = saParamsSource.flatMapLatest(getSimulatedData);

saOutputSource.subscribe(console.log);
saParamsSource.subscribe(x => console.log(x));

function setupFader(value) {
    let fader = $("#sa-main-fader");
    fader.val(0);
    fader.attr("max", value);
}
saOutputSource.subscribe(data => {
    setupFader(data.iters.length);
});

let faderSource =
    fromEvent($("#sa-main-fader"), "input")
        .map(e => $(e.target).val());


let nowIterSource = saOutputSource.flatMapLatest(data => {
    return faderSource.startWith(1).map(index => { return {iter : data.iters[index], sol: data.sol} })
});

nowIterSource.subscribe(data => {
    //render(data);
    for(let key in data.iter) {
        $(`#sa-${key}`).html(data.iter[key]);
    }
});

Rx.Observable.from([1,2,3]).subscribe(console.log);

