let exec = require("child_process").exec
let Rx = require("rx");
let I = require("immutable");
let express = require("express");
let bodyParser = require("body-parser");

let app = express();

app.use(bodyParser.json());

let execObs = function (command) {
    return Rx.Observable.create(function (observer) {
        let process = exec(command, (err, stdout, stderr) => {
            if(err !== null) observer.onError(err);
            else {
                observer.onNext([stdout, stderr]);
                observer.onCompleted();
            }
        }); 
        return function() {
            
            if(process) {
                console.log("DISPOSED");
                process.kill("SIGKILL");
            }
        }
    });
};

let execSource = execObs;

function iter_line_to_json(iter_line) {
    let res = {};
    let names = ["iter", "evals", "temp", "pos", "energy", "best_energy"]
    for(let i = 0; i < names.length; i++) {
        res[names[i]] = JSON.parse(iter_line[i]);
    }
    return res;
}

function fromJsonData(json) {
    json["step_size"] = 0; // non important, should have done it somewhere else...
    json["n_tries"] = 0;

    let prepared = JSON.stringify(json).replace(/"/g,"\\\"");
    let source = execSource(`./c/main "${prepared}"`).share();
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
    console.log("REQ!");
    let sub = fromJsonData(req.body).subscribe(x => res.send(x), err=>res.sendStatus(400))
    req.on("close", function() {
        console.log("aSD");
        sub.dispose();
    });
    
})

app.listen(8089)