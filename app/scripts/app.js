
import React from "react";
import Timer from "./ui/Timer";
import I from "immutable";

let mountNode = document.getElementById("app");

let TodoList = React.createClass({
  render: function() {
    let createItem = function(itemText) {
      return <li>{itemText}</li>;
    };
    return <ul>{this.props.items.map(createItem)}</ul>;
  }
});
var TodoApp = React.createClass({
  getInitialState: function() {
    return {
        items: [], text: '',
        others: Immutable.Map({})
    };
  },
  onChange: function(e) {
    this.setState({text: e.target.value, others: this.state.others.set(e.target.value, 1)});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});
  },
  render: function() {
    return (
      <div>
        <h3></h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
          <input onChange={this.onChange} value={this.state.text} />
          <button>{'Add #' + (this.state.items.length + 1)}</button>
        </form>
        <Timer />
      </div>
    );
  }
});


React.render(<TodoApp />, mountNode);

