let exec = require("child_process").exec
let Rx = require("rx");
let I = require("immutable");
let express = require("express");
let bodyParser = require("body-parser");

let app = express();

app.use(bodyParser.json());

// var o = {
//     temp_init: 1000,
//     temp_min: 1,
//     damp_factor: 1.02,
//     k: 1,
//     step_size:1,
//     iters_for_each_t: 200,
//     n_tries: 200,
//     points: [{x: 10, y: 20}, {x: 20, y: 30}, {x:15, y:35}, {x:25, y:3}]
// }


let execSource = Rx.Observable.fromNodeCallback(exec);

function iter_line_to_json(iter_line) {
    let res = {};
    let names = ["iter", "evals", "temp", "pos", "energy", "best_energy"]
    for(let i = 0; i < names.length; i++) {
        res[names[i]] = JSON.parse(iter_line[i]);
    }
    return res;
}

function fromJsonData(json) {
    let prepared = JSON.stringify(json).replace(/"/g,"\\\"");
    let source = execSource(`./c/main "${prepared}"`);
    return source
        .flatMap(([lines, stderr]) => {
            if(stderr) return Rx.Observable.throwError(stderr);
            return Rx.Observable.from(lines.split("\n")).skip(1)
        })
        .map(line => {
            if(line.startsWith("SOLUTION"))
                return {sol: JSON.parse(line.split(" ")[1])}
                return iter_line_to_json(line.trim().split(/ +/))
        })
        .reduce((acc, line) => {
            if(line.sol)
                return Object.assign({}, acc, line);
            acc.iters = acc.iters.concat([line]);
            return acc;
        }, {iters:[]})
}

// fromJsonData(o).subscribe(x => console.log(x), x=> console.log("ERROR" + x));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post("/", (req, res) => {
    console.log(req.body);
    fromJsonData(req.body).subscribe(x => res.send(x), err=>res.sendStatus(400))
})

app.listen(8089)