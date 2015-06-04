"use strict";

let spawn = require("child_process").spawn
let Rx = require("rx"),
    Observable = Rx.Observable;
let express = require("express");
let bodyParser = require("body-parser");

let app = express();

let spawnObs = function (...spawnArgs) {
    return Observable.create(function (observer) {
        let proc = spawn(...spawnArgs);
        proc.stdout.on("data", out => observer.onNext([out.toString(), ""]));
        proc.stderr.on("data", err => observer.onNext(["", err.toString()]));
        proc.on("close", () => observer.onCompleted());
        proc.on("error", err => observer.onError(err));

        return function() {
            if(proc) proc.kill();
        }
    });
};

function iterLineToJson(iterLine) {
    let res = {};
    let names = ["iter", "evals", "temp", "pos", "energy", "best_energy"]
    for(let i = 0; i < names.length; i++) {
        res[names[i]] = JSON.parse(iterLine[i]);
    }
    return res;
}

function fromJsonData(json) {

    // non important for the algorithm implementation, .. dirty
    json.step_size = 0;
    json.n_tries = 0;

    let prepared = JSON.stringify(json);
    let spawnDataSource =
        spawnObs("./c/main", [prepared])
            .reduce((acc, chunk) => acc.map((subacc, i) => subacc.concat(chunk[i])), ["",""])
            .share();
    spawnDataSource.do(console.log)
    return spawnDataSource
        .flatMap(([lines, stderr]) =>
            stderr ?
                Observable.throwError(stderr) : Observable.from(lines.split("\n")).skip(1)
        )
        .map(line =>
            line.startsWith("SOLUTION") ?
                {sol: JSON.parse(line.split(" ")[1])} : iterLineToJson(line.trim().split(/ +/))
        )
        .reduce(
            (acc, line) =>
                Object.assign({}, acc, line.sol ? line : { iters: acc.iters.concat([line]) }),
            {iters:[]})
}


app.use(bodyParser.json());

// CORS middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post("/", (req, res) => {
    let dataSource = fromJsonData(req.body).share();
    let sub = dataSource.subscribe(
        data => res.send(data),
        err => (console.log(`ERROR: ${err}`), res.sendStatus(400))
    );
    req.on("close", function() {
        sub.dispose();
    });
})

app.listen(8089);
