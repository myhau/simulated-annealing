"use strict";

const Rx = require("rx-dom");
const Observable = Rx.Observable;

const I = require("immutable");
const chroma = require("chroma-js");

const Render = require("./render.js");

const serverName = `http://${location.hostname}:8089/`;

const UPPER_ITERATIONS_LIMIT = 100 * Math.pow(10,6);//

const tempColorInterpolation = chroma.scale(["#21AB6C","#60A744","#8E9E1D","#B99106","#DE7E24","#F9684A"]);

function getSimulatedData(params) {
  let wrkr = new Worker("scripts/workers/worker.js")
  return new Promise(function(res, rej) {
    wrkr.onmessage = (e) => {
      res(e.data)
    }
    wrkr.postMessage(params)
  })
}

function* range(first, last, interval = 1) {
  for(let i = first; last > i; i += interval)
    yield i;
}

function* randomWithMaxAbs(x, y, count) {
  for(let _i of range(0, count))
    yield { x: x * ( 2 * Math.random() - 1),
            y: y * (2 * Math.random()  - 1) };
}

function fromSerializedToObject(arr) {
  let res = {};
  arr.forEach(({name, value}) => (res[name] = JSON.parse(value)));
  return res;
}

function formEventToDataObject(ev, form) {
  ev.preventDefault();
  return fromSerializedToObject($(form).serializeArray());
}

const RANDOM_NODES = 10;
const clickSource =
  Observable.merge(
    ...["click", "submit"]
      .map(ev =>
        Observable.fromEvent($("#points-add"), ev)
          .map(x => formEventToDataObject(x, "#sa-points"))
          .map(({x, y}) => ({x, y:-y}))
      ),
    Observable.fromEvent($("#points-random"), "click")
      .map(x => formEventToDataObject(x, "#sa-points"))
      .flatMap(point =>
        Observable.from(randomWithMaxAbs(point.x, point.y, RANDOM_NODES))
      )
  )
  .share();

const undoSource =
  Observable.merge(
    Observable.fromEvent(window, "keydown")
      .filter(e => (e.keyCode === 90 && e.ctrlKey)),
    Observable.fromEvent($("#points-undo"), "click")
      .do(e => e.preventDefault())).share();

const resetSource =
  Observable.fromEvent($("#points-reset"), "click")
    .do(e => e.preventDefault()).share();

const pointsSource =
  Observable.merge(
    clickSource.map(point => ({type: "click", point})),
    undoSource.map(() => ({type: "undo"})),
    resetSource.map(() => ({type: "reset"}))
  )
  .scan([],
    (acc, {type, point}) => {
      const actions = {
        click: () => acc.concat(point),
        undo: () => acc.slice(0,-1),
        reset: () => [],
      };
      return actions[type]();
    }
  );

pointsSource.subscribe(points => {
  Render.renderOnlyPoints(points, tempColorInterpolation(1).hex());
});

const above2PointsSource = pointsSource.filter(points => points.length > 2);

function llog(base, x) {
  return Math.log(x) / Math.log(base);
}

function iterationsForParams(params) {
  const neededArgs = [
    params.damp_factor,
    params.temp_min,
    params.temp_init,
    params.iters_for_each_t
  ];
  const [damp, tMin, tMax, it] = neededArgs.map(parseFloat);
  return llog(2 - damp, tMin/tMax) * it;
}

function validateSaParams(params) {
  return iterationsForParams(params) < UPPER_ITERATIONS_LIMIT;
}

const [formSource, badFormSource] =
  Observable.fromEvent($("#sa-params"), "submit")
    .map(e =>
      (e.preventDefault(), fromSerializedToObject($(e.target).serializeArray()))
    )
    .partition(validateSaParams);

badFormSource.subscribe(() => console.log("Bad data in form"));

const saParamsSource =
  formSource.withLatestFrom(
    above2PointsSource,
    (formData, points) => Object.assign({}, formData, {"points": points})
  );


saParamsSource.subscribe((data) => console.log(data))

const [saOutputSource, saComputationErrorSource] =
  saParamsSource
    .flatMapLatest(params => getSimulatedData(params).catch(Observable.just("err")))
    .share()
    .partition(res => res !== "err");

const waitingDialog = require("./wait-dialog.js");

const showWaitSource = saParamsSource;
const hideWaitSource =
  Observable.merge(
    saOutputSource,
    badFormSource,
    saComputationErrorSource
  )
  .share();

const errorsSource =
  Observable.merge(
    badFormSource
      .map(() =>
        `This form looks suspicious, maxmium iterations ` +
        `number I can handle is ${UPPER_ITERATIONS_LIMIT}`),
    saComputationErrorSource.map(() => "Backend failed.")
  )
  .share();

errorsSource.subscribe(err => {
  $("#mainErrorCont").removeClass("hidden");
  $("#mainError").html(err);
  setTimeout(() => $("#mainErrorCont").addClass("hidden"), 3000);
});

showWaitSource.subscribe(() => waitingDialog.show("Loading", {dialogSize : "sm"}));
hideWaitSource.subscribe(() => waitingDialog.hide());

function setupFader(value) {
  const fader = $("#sa-main-fader");
  fader.val(0);
  fader.attr("max", value);
}

saOutputSource.subscribe(data => {
  setupFader(data.iters.length - 1);
});

const faderSource =
  Observable.fromEvent($("#sa-main-fader"), "input")
    .throttleFirst(40)
    .map(e => $(e.target).val());

saOutputSource.subscribe(data => {
  Render.renderCharts(data);
});

const nowIterSource =
  saOutputSource
    .flatMapLatest(data =>
      faderSource
        .startWith(0)
        .map(index => ({ iter : data.iters[index], sol: data.sol }))
    );

const graphDataSource =
  Observable.combineLatest(
    nowIterSource,
    saParamsSource,
    (data, params) => ({
      data,
      tempMax: params.temp_init,
      tempMin: params.temp_min,
      points: params.points,
    })
  );

graphDataSource
  .subscribe(({ data, tempMin, tempMax, points }) => {
    const nowTemp = (data.iter.temp / (tempMax - tempMin));
    const tempColor = tempColorInterpolation(nowTemp).hex();
    Render.render(data, points, tempColor);
    for(let key in data.iter) {
      $(`#sa-${key}`).html(JSON.stringify(data.iter[key]));
    }
    $("#sa-temp-color").css("background-color",tempColor);
    $("#sa-best_pos").html(JSON.stringify(data.sol));
  });
