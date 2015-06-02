"use strict";

let I = require("immutable");

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function toSigmaNodes(points, color) {
    return points.map((point, i) => ({
        label: ""+i,
        id: ""+i,
        size: 2,
        x: point.x,
        y: point.y,
        color
    }))
}

function toSigmaEdges(edges, points) {
    return edges.map((edge, i) => ({
        id: ""+i,
        label: ""+distance(points[edge[0]], points[edge[1]]),
        source: ""+edge[0],
        target: ""+edge[1],
        size: 2,
        type: ["curve"]
    }))
}
// TODO: clean this shit up
let Render = {

    init() {
        this.g = new sigma({
          renderers: [
            {
              container: document.getElementById("graph-container"),
              type: "canvas"
            }
          ]
        });
        this.prevCost = 0;
        this.edgesPrev = [];
        this.nodesPrev = [];
        this.g.settings({
            edgeColor: "default",
            nodeColor: "default",
            defaultEdgeColor: "#0000ff",
            defaultNodeColor: "#ff0000",
            "minNodeSize": 3,
            "minEdgeSize": 1
        });
    },
    renderOnlyPoints(points, color) {
        let nodes = toSigmaNodes(points, color);
        this.nodesPrev = nodes;
        this.g.graph.clear()
        this.g.graph.read({nodes})
        this.g.refresh();
    },
    render(data, points, color) {
        let nowCost = data.iter.energy;
        if(nowCost === this.prevCost) return;
        let edges = I.List(data.iter.pos);
        edges = edges.shift().concat(edges.first()).zip(edges);
        let nodes = toSigmaNodes(points, color);
        edges = toSigmaEdges(edges, points).toArray();
        this.g.settings({
            "defaultEdgeColor": color,
            "defaultNodeColor": color
        })

        if(nodes !== this.nodesPrev) {
            this.nodesPrev.map(n => n.id).forEach(id => {
                this.g.graph.dropNode(id)
            })
            nodes.forEach(n => {
                this.g.graph.addNode(n);
            })
        }
        else if(edges !== this.edgesPrev) {
            this.edgesPrev.map(e => e.id).forEach(id => {
                this.g.graph.dropEdge(id);
            })
        }
        if(edges !== this.edgesPrev || nodes !== this.nodesPrev) {
            edges.forEach(e => {
                this.g.graph.addEdge(e);
            })
            this.g.refresh();
        }
        this.nodesPrev = nodes;
        this.edgesPrev = edges;
        this.prevCost = nowCost;
    },
    clear() {
        this.g.graph.clear();
        this.g.reset();
    }

};

module.exports = Object.create(Render);
module.exports.init();
