# Validated Statistics Engine for LLM Control Plane

This microservice provides formally validated statistical functions for entropy analysis and cognitive workspace validation in the LLM Control Plane system.

## Architecture

The statistics engine is implemented as a separate microservice using FastAPI and SciPy to ensure numerical stability and academic validity. This isolates the statistical computations from the main Node.js application.

## Endpoints

### `/health`
Health check endpoint to verify the service is running.

### `/ttest`
Performs Welch's t-test for two independent samples, accounting for potentially unequal variances and sample sizes.

**Request body:**
```json
{
  "sample_a": [1.0, 2.0, 3.0],
  "sample_b": [2.0, 3.0, 4.0]
}
```

**Response:**
```json
{
  "t_statistic": -1.224744871391589,
  "p_value": 0.2516342707324065,
  "degrees_of_freedom": 4.0,
  "cohens_d": -0.7071067811865476,
  "mean_a": 2.0,
  "mean_b": 3.0,
  "std_a": 1.0,
  "std_b": 1.0
}
```

### `/correlation`
Calculates Pearson and/or Spearman correlation coefficients.

**Request body:**
```json
{
  "sample_a": [1.0, 2.0, 3.0, 4.0, 5.0],
  "sample_b": [2.0, 4.0, 6.0, 8.0, 10.0],
  "method": "both"
}
```

### `/bootstrap`
Calculates bootstrap confidence intervals for mean.

**Request body:**
```json
{
  "data": [1.0, 2.0, 3.0, 4.0, 5.0],
  "n_boot": 1000,
  "alpha": 0.05
}
```

### `/onesample-ttest`
Performs one-sample t-test against population mean.

### `/effect-size`
Calculates Cohen's d effect size for two samples.

### `/confidence-interval`
Calculates standard confidence interval for sample mean.

## Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
uvicorn app.main:app --reload
```

The service will be available at `http://localhost:8000`.

## Running with Docker

Build the image:
```bash
docker build -t llm-stats-engine .
```

Run the container:
```bash
docker run -p 8000:8000 llm-stats-engine
```

## Testing

Run the test suite:
```bash
pytest tests/
```

## Numerical Validation

All statistical functions use SciPy and NumPy for numerically stable computations. The test suite includes regression tests against known reference values to ensure correctness.

## Integration with LLM Control Plane

The main Node.js application communicates with this service via HTTP requests to perform statistically valid analyses of system entropy, cognitive workspace effectiveness, and other metrics.