"use strict";

let Rx = require("rx-dom"),
    Obs = Rx.Observable;

let I = require("immutable");
let chroma = require("chroma-js");

let Render = require("./render.js");

let serverName = `http://${location.hostname}:8089/`;

const UPPER_ITERATIONS_LIMIT = 100 * 10**6;

let tempColorInterpolation = chroma.scale(["#21AB6C","#60A744","#8E9E1D","#B99106","#DE7E24","#F9684A"]);

function getSimulatedData(params) {
    return Obs.fromPromise($.ajax({
        url: serverName,
        data: JSON.stringify(params),
        contentType: "application/json",
        crossDomain: true,
        method: "POST",
        accepts: "json"
    })
    .promise());
}

function* randomWithMaxAbs(x, y, count) {
    for(let i = 0; count > i; i++) {
        yield {x: x * (2 * Math.random() - 1), y: y * (2 * Math.random()  - 1)}
    }
}

function fromSerializedToObject(arr) {
    let res = {};
    arr.forEach(({name, value}) => { res[name] = JSON.parse(value); });
    return res;
}
function formEventToDataObject(ev, form) {
    ev.preventDefault();
    return fromSerializedToObject($(form).serializeArray());
}

const RANDOM_NODES = 10;
let clickSource =
    Obs.merge(
        ...["click", "submit"].map(ev => Obs.fromEvent($("#points-add"), ev)
            .map(x => formEventToDataObject(x, "#sa-points"))
            .map(({x, y}) => ({x, y:-y}))),
        Obs.fromEvent($("#points-random"), "click")
            .map(x => formEventToDataObject(x, "#sa-points"))
            .flatMap(point => {
                return Obs.from(randomWithMaxAbs(point.x, point.y, RANDOM_NODES))
    }))
    .share();

let undoSource =
    Obs.merge(
        Obs.fromEvent(window, "keydown")
            .filter(e => (e.keyCode === 90 && e.ctrlKey)),
        Obs.fromEvent($("#points-undo"), "click")
            .do(e => e.preventDefault())).share();

let resetSource =
    Obs.fromEvent($("#points-reset"), "click")
        .do(e => e.preventDefault()).share();

let pointsSource = Obs.merge(
    clickSource.map(point => ({type: "click", point})),
    undoSource.map(_e => ({type: "undo"})),
    resetSource.map(_e => ({type: "reset"})))
    .scan([],
        (acc, {type, point}) => {
            let actions = {
                click: ()=>acc.concat(point),
                undo: ()=>acc.slice(0,-1),
                reset: ()=>[]
            }
            return actions[type]();
        }
    );

pointsSource.subscribe(points => {
    Render.renderOnlyPoints(points, tempColorInterpolation(1).hex());
})

let above2PointsSource = pointsSource.filter(points => points.length > 2);

function llog(base, x) {
    return Math.log(x) / Math.log(base);
}

function iterationsForParams(params) {
    let neededArgs = [params.damp_factor, params.temp_min, params.temp_init, params.iters_for_each_t];
    let [damp, t_min, t_max, it] = neededArgs.map(parseFloat);
    console.log([damp, t_min, t_max, it]);
    return llog(2 - damp, t_min/t_max) * it;
}

function validateSaParams(params) {
    console.log(iterationsForParams(params));
    return iterationsForParams(params) < UPPER_ITERATIONS_LIMIT;
}

let [formSource, badFormSource] =
    Obs.fromEvent($("#sa-params"), "submit")
        .map(e => { e.preventDefault(); return fromSerializedToObject($(e.target).serializeArray()); })
        .partition(validateSaParams);

badFormSource.subscribe(_x=>console.log("Bad data in form"));

let saParamsSource = formSource.withLatestFrom(above2PointsSource, (formData, points) => Object.assign({}, formData, {"points": points}));

let [saOutputSource, saComputationErrorSource] =
    saParamsSource
        .flatMapLatest(params =>
            getSimulatedData(params)
                .catch(Obs.just("err")))
        .share()
        .partition(res => res !== "err");

let waitingDialog = require("./wait-dialog.js");

let showWaitSource = saParamsSource;
let hideWaitSource =
    Obs.merge(
        saOutputSource,
        badFormSource,
        saComputationErrorSource
    )
    .share();

let errorsSource =
    Obs.merge(
        badFormSource.map(_x => `This form looks suspicious, maxmium iterations number I can handle is ${UPPER_ITERATIONS_LIMIT}`),
        saComputationErrorSource.map(_x => "Backend failed.")
    )
    .share();

errorsSource.subscribe(err => {
    $("#mainErrorCont").removeClass("hidden");
    $("#mainError").html(err);
    setTimeout(() => $("#mainErrorCont").addClass("hidden"), 3000);
});

showWaitSource.subscribe(_x => waitingDialog.show("Loading", {dialogSize : "sm"}));
hideWaitSource.subscribe(_x => waitingDialog.hide());

function setupFader(value) {
    let fader = $("#sa-main-fader");
    fader.val(0);
    fader.attr("max", value);
}

saOutputSource.subscribe(data => {
    setupFader(data.iters.length - 1);
});

let faderSource =
    Obs.fromEvent($("#sa-main-fader"), "input")
        .throttleFirst(40)
        .map(e => $(e.target).val());

saOutputSource.subscribe(data => {
    const MAX_POINTS = 700;
    let len = data.iters.length;
    let everyPoint = Math.ceil(len / MAX_POINTS);
    let sparseData = data.iters.filter((_el, i) => i % everyPoint === 0)
    let sharedOptions = {
        x_label: "Iteration",
        x_accessor: "iter",
        data: sparseData,
        width: 450,
        height: 330,
        right: 40,
        left: 80,
        bottom: 80,
        area: false,
        linked: true,
        animate_on_load: false,
        transition_on_update: false
    };
    MG.data_graphic(Object.assign({}, sharedOptions, {
            // title: "Temperature",
            target: "#tempChart",
            y_label: "Temperature",
            y_accessor: "temp",
    }));
    MG.data_graphic(Object.assign({}, sharedOptions, {
            // title: "Energy",
            target: "#energyChart",
            y_label: "Energy",
            y_accessor: "energy"
    }));
});

let nowIterSource = saOutputSource.flatMapLatest(data => {
    return faderSource.startWith(0).map(index => { return {iter : data.iters[index], sol: data.sol} })
});

let graphDataSource = Obs.combineLatest(nowIterSource, saParamsSource,
    (data, params) => ({data, tempMax: params.temp_init, tempMin: params.temp_min, points: params.points}));

graphDataSource
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
