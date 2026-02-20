from pydantic import BaseModel
from typing import List, Literal, Optional

class TwoSampleRequest(BaseModel):
    sample_a: List[float]
    sample_b: List[float]

class OneSampleRequest(BaseModel):
    sample: List[float]
    population_mean: Optional[float] = 0.0
    confidence_level: Optional[float] = 0.95

class BootstrapRequest(BaseModel):
    data: List[float]
    n_boot: int = 10000
    alpha: float = 0.05

class CorrelationRequest(BaseModel):
    sample_a: List[float]
    sample_b: List[float]
    method: Literal["pearson", "spearman", "both"] = "both"

class PowerAnalysisRequest(BaseModel):
    effect_size: float
    n1: int
    n2: Optional[int] = None
    alpha: float = 0.05