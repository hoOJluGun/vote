from fastapi import FastAPI
from .statistics_core import StatisticsCore
from .models import TwoSampleRequest, BootstrapRequest, CorrelationRequest, OneSampleRequest, PowerAnalysisRequest
import os

app = FastAPI(
    title="Validated Stats Engine for LLM Control Plane",
    description="Formally validated statistical functions for entropy analysis and cognitive workspace validation",
    version="1.0.0"
)

@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "engine": "validated-stats", "version": "1.0.0"}

@app.post("/ttest")
def ttest(request: TwoSampleRequest):
    """
    Perform Welch's t-test for two independent samples
    Accounts for potentially unequal variances and sample sizes
    """
    return StatisticsCore.welch_ttest(request.sample_a, request.sample_b)

@app.post("/correlation")
def correlation(request: CorrelationRequest):
    """
    Calculate Pearson and Spearman correlation coefficients
    """
    if request.method == "pearson":
        return StatisticsCore.pearson_correlation(request.sample_a, request.sample_b)
    elif request.method == "spearman":
        return StatisticsCore.spearman_correlation(request.sample_a, request.sample_b)
    else:
        return StatisticsCore.both_correlations(request.sample_a, request.sample_b)

@app.post("/bootstrap")
def bootstrap(request: BootstrapRequest):
    """
    Calculate bootstrap confidence intervals for mean
    """
    return StatisticsCore.bootstrap_mean_ci(
        request.data,
        request.n_boot,
        request.alpha
    )

@app.post("/onesample-ttest")
def onesample_ttest(request: OneSampleRequest):
    """
    Perform one-sample t-test against population mean
    """
    return StatisticsCore.onesample_ttest(
        request.sample,
        request.population_mean
    )

@app.post("/effect-size")
def effect_size(request: TwoSampleRequest):
    """
    Calculate Cohen's d effect size for two samples
    """
    return StatisticsCore.cohens_d(request.sample_a, request.sample_b)

@app.post("/confidence-interval")
def confidence_interval(request: OneSampleRequest):
    """
    Calculate standard confidence interval for sample mean
    """
    return StatisticsCore.confidence_interval(
        request.sample,
        request.confidence_level
    )

@app.post("/power-analysis")
def power_analysis(request: PowerAnalysisRequest):
    """
    Calculate statistical power for two-sample t-test
    """
    return StatisticsCore.power_analysis(
        request.effect_size,
        request.n1,
        request.n2,
        request.alpha
    )

@app.post("/bayesian-ttest")
def bayesian_ttest(request: TwoSampleRequest):
    """
    Perform Bayesian t-test
    """
    return StatisticsCore.bayesian_ttest(
        request.sample_a,
        request.sample_b
    )