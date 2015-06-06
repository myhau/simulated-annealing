"use strict";

const I = require("immutable");

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function toSigmaNodes(points, color) {
  return points.map((point, i) => ({
    label: String(i),
    id: String(i),
    size: 2,
    x: point.x,
    y: point.y,
    color,
  }))
}

function toSigmaEdges(edges, points) {
  return edges.map((edge, i) => ({
    id: String(i),
    label: String(distance(points[edge[0]], points[edge[1]])),
    source: String(edge[0]),
    target: String(edge[1]),
    size: 2,
    type: ["curve"],
  }))
}
// FIXME: CLEAN THIS SHIT UP
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
    this.g.graph.clear();
    this.g.graph.read({nodes});
    this.g.refresh();
  },

  renderCharts(data) {
    const MAX_POINTS = 1000;
    const len = data.iters.length;
    const everyPoint = Math.ceil(len / MAX_POINTS);
    const sparseData = data.iters.filter((_el, i) => i % everyPoint === 0);

    const sharedOptions = {
      x_label: "Iteration",
      x_accessor: "iter",
      data: sparseData,
      width: 450,
      height: 300,
      right: 40,
      left: 80,
      bottom: 80,
      area: false,
      linked: true,
      animate_on_load: false,
      transition_on_update: false,
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
      y_accessor: "energy",
    }));
  },

  render(data, points, color) {

    const nowCost = data.iter.energy;
    if(nowCost === this.prevCost) return;

    const positions = I.List(data.iter.pos);
    const edges =
      positions
        .shift()
        .concat(positions.first())
        .zip(positions);

    const sigmaEdges = toSigmaEdges(edges, points).toArray();
    const sigmaNodes = toSigmaNodes(points, color);

    this.g.settings({
      "defaultEdgeColor": color,
      "defaultNodeColor": color
    })

    if(sigmaNodes !== this.nodesPrev) {
      this.nodesPrev.map(n => n.id).forEach(id => {
        this.g.graph.dropNode(id)
      })
      sigmaNodes.forEach(n => {
        this.g.graph.addNode(n);
      })
    }
    else if(sigmaEdges !== this.edgesPrev) {
      this.edgesPrev.map(e => e.id).forEach(id => {
        this.g.graph.dropEdge(id);
      })
    }
    if(sigmaEdges !== this.edgesPrev || sigmaNodes !== this.nodesPrev) {
      sigmaEdges.forEach(e => {
        this.g.graph.addEdge(e);
      })
      this.g.refresh();
    }
    this.nodesPrev = sigmaNodes;
    this.edgesPrev = sigmaEdges;
    this.prevCost = nowCost;
  },

  clear() {
    this.g.graph.clear();
    this.g.reset();
  }

};

module.exports = Object.create(Render);
module.exports.init();
