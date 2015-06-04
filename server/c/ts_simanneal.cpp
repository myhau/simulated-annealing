/* Author: Michal Fudala
 *
 */

#include "ts_simanneal.h"

double** distance_matrix;
point* points;
int n_points;


/* energy for the travelling salesman problem */
double Etsp(void *xp) {
	/* an array of n_points integers describing the order */
	int *route = (int *) xp;
	double E = 0;
	unsigned int i;

	for (i = 0; i < n_points; ++i) {
		E += distance_matrix[route[i]][route[(i + 1) % n_points]];
	}

	return E;
}

double Mtsp(void *xp, void *yp) {
	int *route1 = (int *) xp, *route2 = (int *) yp;
	double distance = 0;
	unsigned int i;

	for (i = 0; i < n_points; ++i) {
		distance += ((route1[i] == route2[i]) ? 0 : 1);
	}

	return distance;
}

/* take a step through the TSP space */
void Stsp(const gsl_rng * r, void *xp, double step_size) {
	int x1, x2, dummy;
	int *route = (int *) xp;

	step_size = 0; /* prevent warnings about unused parameter */

	/* pick the two cities to swap in the matrix; we leave the first
	 city fixed */
	x1 = (gsl_rng_get(r) % (n_points - 1)) + 1;
	do {
		x2 = (gsl_rng_get(r) % (n_points - 1)) + 1;
	} while (x2 == x1);

	dummy = route[x1];
	route[x1] = route[x2];
	route[x2] = dummy;
}

void Ptsp(void *xp) {
	unsigned int i;
	int *route = (int *) xp;
	printf(" [");
	for (i = 0; i < n_points - 1; ++i) {
		printf("%d,", route[i]);
	}
	printf("%d", route[n_points - 1]);
	printf("] ");
}

double point_distance(point first, point second) {
	return sqrt(pow(first.x - second.x, 2) + pow(first.y - second.y, 2));
}

void prepare_distance_matrix() {
	unsigned int i, j;
	double dist;
	unsigned int n = n_points;
	for (i = 0; i < n; ++i) {
		for (j = 0; j < n; ++j) {
			if (i == j) {
				dist = 0;
			} else {
				dist = point_distance(points[i], points[j]);
			}
			distance_matrix[i][j] = dist;
		}
	}
}

static void _solve(point* p, int n, int n_tries, int iters_for_each_t,
		double step_size, double k, double t_initial, double t_min,
		double damp_factor) {


	gsl_siman_params_t params = { n_tries, iters_for_each_t, step_size, k,
			t_initial, damp_factor, t_min };

	points = p;
	n_points = n;

	distance_matrix = new double* [n_points];
	for(int i = 0; n_points > i; i++) {
		distance_matrix[i] = new double [n_points];
	}

	int* x_initial = new int[n_points];
	unsigned int i;

	const gsl_rng * r = gsl_rng_alloc(gsl_rng_env_setup());

	gsl_ieee_env_setup();

	prepare_distance_matrix();

	/* set up a trivial initial route */
	for (i = 0; i < n_points; ++i) {
		x_initial[i] = i;
	}

	gsl_siman_solve(r, x_initial, Etsp, Stsp, Mtsp, Ptsp, NULL, NULL, NULL,
			n_points * sizeof(int), params);

	printf("SOLUTION:");
	Ptsp((void*)x_initial);

}

void solve(params* p) {
	_solve(p->points, p->n_points, p->n_tries,
			p->iters_for_each_t, p->step_size, p->k,
			p->temp_init, p->temp_min, p->damp_factor);
}





