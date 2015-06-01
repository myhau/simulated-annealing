"use strict";

let Rx = require("rx-dom");
let I = require("immutable");
let $ = require("jquery");
let chroma = require("chroma-js");

let from = Rx.Observable.from,
    fromEvent = Rx.Observable.fromEvent,
    fromPromise = Rx.Observable.fromPromise;

let Render = require("./render.js");

let sigmaCamera = Render.getSigma().camera;

let serverName = "http://localhost:8089/";

let paramNames =
    ["temp_init", "temp_min", "damp_factor", "k", "iters_for_each", "n_tries"];

let tempColorInterpolation = chroma.scale(["#21AB6C","#60A744","#8E9E1D","#B99106","#DE7E24","#F9684A"]);


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

function toSigmaCoords(e) {
    let x1 = sigma.utils.getX(e) - e.target.offsetWidth / 2;
    let y1 = sigma.utils.getY(e) - e.target.offsetHeight / 2;
    let {x, y} = sigmaCamera.cameraPosition(x1, y1);

    return {x, y};
}

let clickSource = 
    fromEvent($("#graph-container canvas:last-child"), "click")
        .map(e => (toSigmaCoords(e)))

let undoSource =
    fromEvent(window, "keydown") 
        .filter(e => (e.keyCode == 90 && e.ctrlKey))

let pointsSource = Rx.Observable.merge(
    clickSource.map(c => ({type:"click", point:c})),
    undoSource.map(_e => ({type:"undo"}))
    )
    .scan([], 
        (acc, {type, point}) => 
            (type == "click") ? acc.concat(point) : acc.slice(0, -1)
        )
pointsSource.subscribe(points => {
    Render.renderOnlyPoints(points);
})

let above2PointsSource = pointsSource.filter(points => points.length > 2);

function validateSaParams() {
    return true;
}

function fromSerializedToObject(arr) {
    let res = {};
    arr.forEach(({name, value}) => { res[name] = parseFloat(value); });
    return res;
}

let [formSource, badFormSource] =
    fromEvent($("#sa-params"), "submit")
        .map(e => { e.preventDefault(); return fromSerializedToObject($(e.target).serializeArray()); })
        .partition(validateSaParams);

badFormSource.subscribe(_x=>console.log("BAD FORM BRO REPAIR IT"));

let saParamsSource = formSource.withLatestFrom(above2PointsSource, (formData, points) => Object.assign({}, formData, {"points":points}));

let saOutputSource = saParamsSource.flatMapLatest(getSimulatedData);

function setupFader(value) {
    let fader = $("#sa-main-fader");
    fader.val(0);
    fader.attr("max", value);
}

saOutputSource.subscribe(data => {
    setupFader(data.iters.length - 1);
});

let faderSource =
    fromEvent($("#sa-main-fader"), "input")
        .throttleFirst(30)
        .map(e => $(e.target).val());


let nowIterSource = saOutputSource.flatMapLatest(data => {
    return faderSource.startWith(1).map(index => { return {iter : data.iters[index], sol: data.sol} })
});


let temperatureDomainSource = new Rx.BehaviorSubject();
saParamsSource.map(params => {return{max: params.temp_init, min:params.temp_min}}).subscribe(temperatureDomainSource);

Rx.Observable.combineLatest(nowIterSource, saParamsSource,
    (data, params) => ({data, tempMax: params.temp_init, tempMin: params.temp_min, points: params.points}))
        .subscribe(({data, tempMin, tempMax, points}) => {
        let nowTemp = (data.iter.temp/(tempMax - tempMin));
        let tempColor = tempColorInterpolation(nowTemp).hex();
        Render.render(data, points, tempColor);
        for(let key in data.iter) {
            $(`#sa-${key}`).html(JSON.stringify(data.iter[key]))
        }
        $("#sa-temp-color").css("background-color",tempColor);
        $("#sa-best_pos").html(JSON.stringify(data.sol))
    });


