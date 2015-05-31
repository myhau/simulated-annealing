/*
 * main.cpp
 *
 *  Created on: May 31, 2015
 *      Author: mihau
 */

#include "rapidjson/document.h"
#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"
#include <iostream>

#include "ts_simanneal.h"

using namespace rapidjson;

struct out_params {

};

std::string toJson(const out_params& par) {
//	Document d;
//	d[""] = 1;
//	StringBuffer buffer;
//	Writer<StringBuffer> writer(buffer);
//	d.Accept(writer);
}

params fromJson(const std::string& json) {

	params in_p;
	Document d;
	d.Parse(json.c_str());


	in_p.temp_init = d["temp_init"].GetDouble();
	in_p.temp_min= d["temp_min"].GetDouble();
	in_p.damp_factor = d["damp_factor"].GetDouble();
	in_p.k = d["k"].GetDouble();
	in_p.step_size = d["step_size"].GetDouble();
	in_p.iters_for_each_t = d["iters_for_each_t"].GetInt();
	in_p.n_tries = d["n_tries"].GetInt();

	Value& points = d["points"];
	in_p.n_points = points.Size();
	in_p.points = new point[in_p.n_points];
	for(auto i = 0; i < points.Size(); i++) {
		Value& edge = points[i];
		in_p.points[i].x = edge["x"].GetDouble();
		in_p.points[i].y = edge["y"].GetDouble();
	}

	return in_p;
}




int main(int argc, char** argv) {
	using namespace std;
	auto json = string(argv[1]);
	params inp = fromJson(json);
	solve(&inp);
}
