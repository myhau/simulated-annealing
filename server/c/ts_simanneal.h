/*
 * ts_simanneal.h
 *
 *  Created on: May 31, 2015
 *      Author: mihau
 */

#ifndef TS_SIMANNEAL_H_
#define TS_SIMANNEAL_H_

#include <math.h>
#include <string.h>
#include <stdio.h>
#include <gsl/gsl_math.h>
#include <gsl/gsl_rng.h>
#include <gsl/gsl_siman.h>
#include <gsl/gsl_ieee_utils.h>

typedef struct point {
	char id[128];
	double x;
	double y;
} point;

typedef struct params {
	double temp_init;
	double temp_min;
	double step_size;
	double damp_factor;
	double k;
	int n_tries;
	int iters_for_each_t;
	point* points;
	int n_points;
} params;


void prepare_distance_matrix();
double point_distance(point first, point second);
double Etsp(void *xp);
double Mtsp(void *xp, void *yp);
void Stsp(const gsl_rng * r, void *xp, double step_size);
void Ptsp(void *xp);
void solve(params* p);


#endif /* TS_SIMANNEAL_H_ */
