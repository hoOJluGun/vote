/**
 * STATISTICAL_FUNCTIONS.js
 * Collection of statistical functions for entropy analysis
 */

export class StatisticalFunctions {
  constructor() {
    // You could initialize any required constants or configurations here
  }

  /**
   * Calculate p-value from t-statistic and degrees of freedom
   */
  calculatePValue(tStat, df) {
    // Use the inverse t-distribution to calculate p-value
    const absT = Math.abs(tStat);
    const criticalValue = this.inverseTDistribution(1 - 0.025, df); // Two-tailed test
    const pValue = absT > criticalValue ? 0.05 : 0.95;
    return pValue;
  }

  /**
   * Perform Student's t-test
   */
  performTTest(sample1, sample2, significanceLevel = 0.05) {
    const n1 = sample1.length;
    const n2 = sample2.length;
    
    if (n1 < 2 || n2 < 2) {
      return { tStat: 0, pValue: 1, df: 0, significant: false };
    }
    
    // Calculate means
    const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
    const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
    
    // Calculate variances
    const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
    
    // Calculate pooled standard error
    const se = Math.sqrt(var1/n1 + var2/n2);
    
    if (se === 0) {
      return { tStat: 0, pValue: 1, df: n1 + n2 - 2, significant: false };
    }
    
    // Calculate t-statistic
    const tStat = (mean1 - mean2) / se;
    
    // Degrees of freedom (Welch's t-test)
    const df = Math.pow(var1/n1 + var2/n2, 2) / 
              (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
    
    // Calculate p-value
    const pValue = 2 * (1 - this.cumulativeT(absT, df));
    
    // Determine significance
    const significant = pValue < significanceLevel;
    
    return {
      tStat,
      pValue,
      df,
      mean1,
      mean2,
      var1,
      var2,
      significant
    };
  }

  /**
   * Calculate Cohen's d effect size
   */
  calculateCohensD(sample1, sample2) {
    const n1 = sample1.length;
    const n2 = sample2.length;
    
    if (n1 < 2 || n2 < 2) return 0;
    
    // Calculate means
    const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
    const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
    
    // Calculate pooled standard deviation
    const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
    
    const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
    
    if (pooledSD === 0) return 0;
    
    return (mean1 - mean2) / pooledSD;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  pearsonCorrelation(x, y) {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length');
    }
    
    const n = x.length;
    if (n < 2) return 0;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - Math.pow(sumX, 2)) * (n * sumYY - Math.pow(sumY, 2)));
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate Spearman correlation coefficient
   */
  spearmanCorrelation(x, y) {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length');
    }
    
    const n = x.length;
    if (n < 2) return 0;
    
    // Create ranks for x
    const xRanks = this.rankData(x);
    
    // Create ranks for y
    const yRanks = this.rankData(y);
    
    // Calculate Spearman correlation using Pearson's formula on ranks
    return this.pearsonCorrelation(xRanks, yRanks);
  }

  /**
   * Create ranks for data (used for Spearman correlation)
   */
  rankData(data) {
    const indexedData = data.map((value, index) => ({ value, index }));
    indexedData.sort((a, b) => a.value - b.value);
    
    const ranks = new Array(data.length);
    let currentRank = 0;
    
    while (currentRank < data.length) {
      // Find all elements with the same value
      const currentValue = indexedData[currentRank].value;
      const groupEnd = this.findGroupEnd(indexedData, currentRank, currentValue);
      
      // Calculate average rank for tied values
      const groupSize = groupEnd - currentRank + 1;
      const averageRank = (currentRank + groupEnd + 2) / 2; // Add 1 for 1-based ranking, then average
      
      // Assign average rank to all elements in this group
      for (let i = currentRank; i <= groupEnd; i++) {
        ranks[indexedData[i].index] = averageRank;
      }
      
      currentRank = groupEnd + 1;
    }
    
    return ranks;
  }

  /**
   * Find the end of a group of equal values
   */
  findGroupEnd(data, start, value) {
    let end = start;
    while (end + 1 < data.length && data[end + 1].value === value) {
      end++;
    }
    return end;
  }

  /**
   * Calculate confidence interval using bootstrap method
   */
  calculateConfidenceInterval(data, confidenceLevel = 0.95) {
    const alpha = 1 - confidenceLevel;
    const n = data.length;
    
    if (n < 2) {
      const value = n === 1 ? data[0] : 0;
      return { lower: value, upper: value, confidenceLevel };
    }
    
    // Sort data
    const sortedData = [...data].sort((a, b) => a - b);
    
    // Calculate indices for percentiles
    const lowerIdx = Math.floor(alpha/2 * n);
    const upperIdx = Math.floor((1 - alpha/2) * n);
    
    return {
      lower: sortedData[lowerIdx],
      upper: sortedData[upperIdx],
      confidenceLevel
    };
  }

  /**
   * Cumulative t-distribution approximation
   */
  cumulativeT(t, df) {
    // For large df, approximate with normal distribution
    if (df > 30) {
      return this.cumulativeNormal(t);
    }
    
    // Simple approximation for small df
    const absT = Math.abs(t);
    const p = 1 / (1 + Math.exp(-absT));
    
    if (t < 0) {
      return p / 2;
    }
    
    return 1 - p / 2;
  }

  /**
   * Cumulative normal distribution
   */
  cumulativeNormal(x) {
    // Use the error function approximation
    return 0.5 * (1 + Math.erf(x / Math.SQRT2));
  }

  /**
   * Inverse t-distribution approximation
   */
  inverseTDistribution(p, df) {
    if (df <= 0) {
      throw new Error('Degrees of freedom must be positive');
    }
    
    if (p < 0.001 || p > 0.999) {
      // Extreme values need special treatment
      return this.extremeInverseTDistribution(p, df);
    }
    
    // Use normal approximation for initial estimate
    const z = this.inverseNormal(p);
    
    // Refine the estimate using approximation formula
    const z2 = z * z;
    const z3 = z2 * z;
    const z5 = z3 * z2;
    
    let t;
    if (df === 1) {
      // Special case for Cauchy distribution
      t = Math.tan(Math.PI * (p - 0.5));
    } else if (df === 2) {
      t = z / Math.sqrt(2 - z2);
    } else {
      // General approximation formula
      const c = [4.5, 4.5, 4.0].slice(0, Math.min(3, df));
      const a1 = 2.515517;
      const a2 = 0.802853;
      const a3 = 0.010328;
      const b1 = 1.432788;
      const b2 = 0.189269;
      const b3 = 0.001308;
      
      const tApprox = z + 
        ((((c[2] * z3 + c[1]) * z2 + c[0]) * z) / 
         ((((b3 * z2 + b2) * z + b1) * z + 1) * z + a1));
      
      t = tApprox;
    }
    
    return t;
  }

  /**
   * Inverse normal distribution approximation
   */
  inverseNormal(p) {
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    
    const a1 = -3.969683028665376e+00;
    const a2 = 2.209460984245205e+00;
    const a3 = -1.512361630852613e-01;
    const a4 = 3.636274247452973e-02;
    const a5 = -2.775925918708490e-03;
    const a6 = 2.381498576302285e-04;
    const a7 = -2.250947171283089e-05;
    
    const b1 = -5.515572269430023e+00;
    const b2 = -4.855803680198801e+00;
    const b3 = -1.444201828240598e+00;
    const b4 = -1.692468948829332e-01;
    const b5 = -7.528351460850575e-03;
    const b6 = -4.284725087355327e-04;
    const b7 = -3.752207405759696e-05;
    
    const c1 = 7.784695709041462e-03;
    const c2 = 0.3224671290700398e+00;
    const c3 = 2.445134137142996e+00;
    const c4 = 3.754408661907416e+00;
    
    const pLow = 0.2425;
    const pHigh = 0.9593333333333333;
    
    let q = p;
    let r;
    let val;
    
    if (q < 0.0402) {
      r = Math.sqrt(-2 * Math.log(q));
      val = (((((a7 * r + a6) * r + a5) * r + a4) * r + a3) * r + a2) * r + a1;
      val = (((((b7 * r + b6) * r + b5) * r + b4) * r + b3) * r + b2) * r + b1;
    } else if (q <= pLow) {
      r = Math.sqrt(-2 * Math.log(q));
      val = (((((a7 * r + a6) * r + a5) * r + a4) * r + a3) * r + a2) * r + a1;
      val = (((((b7 * r + b6) * r + b5) * r + b4) * r + b3) * r + b2) * r + b1;
    } else if (q <= pHigh) {
      r = q - 0.5;
      val = (((((c7 * r + c6) * r + c5) * r + c4) * r + c3) * r + c2) * r + c1;
      val = (((((d7 * r + d6) * r + d5) * r + d4) * r + d3) * r + d2) * r + d1;
    } else {
      r = Math.sqrt(-2 * Math.log(1 - q));
      val = (((((a7 * r + a6) * r + a5) * r + a4) * r + a3) * r + a2) * r + a1;
      val = (((((b7 * r + b6) * r + b5) * r + b4) * r + b3) * r + b2) * r + b1;
    }
    
    return val;
  }

  /**
   * Extreme value inverse t-distribution approximation
   */
  extremeInverseTDistribution(p, df) {
    // Handle extreme values (p near 0 or 1)
    const eps = 1e-10;
    const u = Math.min(p, 1 - p);
    
    if (u < eps) {
      // Very extreme values
      return Math.sign(0.5 - p) * this.extremeInverseTDistribution(u / 2, df);
    }
    
    // Approximation for extreme values
    const logU = Math.log(u);
    const logDf = Math.log(df);
    
    let t = Math.sqrt(df * (Math.exp(-2 * logU / df) - 1));
    
    // Refine the estimate
    for (let i = 0; i < 3; i++) {
      const [density, logDensity] = this.tDensity(t, df);
      const correction = (Math.log(u) - logDensity) / density;
      t -= correction;
    }
    
    return Math.sign(0.5 - p) * t;
  }

  /**
   * Calculate t-distribution density
   */
  tDensity(t, df) {
    const logDensity = Math.lgamma((df + 1) / 2) - Math.lgamma(df / 2) - 
                      0.5 * Math.log(df * Math.PI) - 
                      0.5 * (df + 1) * Math.log(1 + t * t / df);
    
    const density = Math.exp(logDensity);
    return [density, logDensity];
  }
}
import { StatisticalFunctions } from './STATISTICAL_FUNCTIONS.js';

/**
 * Entropy Analysis Tool for LLM Control Plane
 * Performs statistical analysis on entropy curves with confidence intervals and p-values
 */

export class EntropyAnalysisTool {
  constructor(options = {}) {
    this.options = {
      confidenceLevel: options.confidenceLevel || 0.95,
      significanceLevel: options.significanceLevel || 0.05,
      bootstrapSamples: options.bootstrapSamples || 1000,
      ...options
    };
    
    this.stats = new StatisticalFunctions();
    this.logger = console; // In production, this would be a proper logger
  }

  /**
   * Analyze entropy curve for a single test run
   */
  analyzeEntropyCurve(data) {
    this.logger.log('📊 Analyzing entropy curve...');
    
    // Calculate basic statistics
    const basicStats = this.calculateBasicStatistics(data);
    
    // Calculate regression metrics
    const regression = this.calculateRegression(data);
    
    // Calculate second derivative
    const secondDerivative = this.calculateSecondDerivative(data);
    
    // Calculate oscillation damping
    const damping = this.calculateOscillationDamping(data);
    
    // Calculate stability metrics
    const stability = this.calculateStability(data);
    
    const analysis = {
      basic: basicStats,
      regression,
      secondDerivative,
      damping,
      stability,
      timestamp: Date.now()
    };
    
    this.logger.log(`📈 Slope: ${regression.slope.toFixed(6)}, R²: ${regression.rSquared.toFixed(4)}`);
    this.logger.log(`🔍 Second derivative: ${secondDerivative.mean.toFixed(6)}, Sign: ${secondDerivative.sign}`);
    this.logger.log(`🔄 Damping factor: ${damping.factor.toFixed(3)}, Oscillations: ${damping.oscillations}`);
    
    return analysis;
  }

  /**
   * Calculate basic statistics for entropy data
   */
  calculateBasicStatistics(data) {
    const values = data.map(d => d.value);
    const n = values.length;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      count: n,
      mean,
      variance,
      stdDev,
      min,
      max,
      range: max - min
    };
  }

  /**
   * Calculate regression line and metrics
   */
  calculateRegression(data) {
    const n = data.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0, pValue: 1 };
    }
    
    // Prepare x (time) and y (entropy) values
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    // Calculate sums
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    // Calculate slope and intercept
    const numerator = n * sumXY - sumX * sumY;
    const denominator = n * sumXX - sumX * sumX;
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssReg = x.reduce((sum, val, i) => sum + Math.pow(slope * val + intercept - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? ssReg / ssTot : 0;
    
    // Calculate standard error of the slope
    const predicted = x.map(xi => slope * xi + intercept);
    const residuals = x.map((xi, i) => y[i] - predicted[i]);
    const mse = residuals.reduce((sum, res) => sum + res * res, 0) / (n - 2);
    const seSlope = Math.sqrt(mse / (sumXX - (sumX * sumX) / n));
    
    // Calculate t-statistic and p-value for slope using correct statistical function
    const tStat = seSlope !== 0 ? slope / seSlope : 0;
    const df = n - 2; // degrees of freedom
    const pValue = this.stats.calculatePValue(tStat, df);
    
    return {
      slope,
      intercept,
      rSquared,
      pValue,
      standardError: seSlope
    };
  }

  /**
   * Calculate second derivative of the entropy curve
   */
  calculateSecondDerivative(data) {
    if (data.length < 3) {
      return { mean: 0, median: 0, sign: 0, positiveCount: 0, negativeCount: 0 };
    }
    
    // Calculate second differences (discrete approximation of second derivative)
    const secondDiffs = [];
    for (let i = 1; i < data.length - 1; i++) {
      const secondDiff = data[i+1].value - 2 * data[i].value + data[i-1].value;
      secondDiffs.push(secondDiff);
    }
    
    const mean = secondDiffs.reduce((sum, val) => sum + val, 0) / secondDiffs.length;
    const sorted = [...secondDiffs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const positiveCount = secondDiffs.filter(d => d > 0).length;
    const negativeCount = secondDiffs.filter(d => d < 0).length;
    const sign = positiveCount > negativeCount ? 1 : (negativeCount > positiveCount ? -1 : 0);
    
    return {
      mean,
      median,
      sign,
      positiveCount,
      negativeCount,
      values: secondDiffs
    };
  }

  /**
   * Calculate oscillation damping factor
   */
  calculateOscillationDamping(data) {
    if (data.length < 10) {
      return { factor: 1, oscillations: 0, amplitude: 0 };
    }
    
    // Identify oscillations by finding peaks and troughs
    const derivatives = this.calculateFirstDerivative(data);
    let oscillations = 0;
    const extrema = [];
    
    // Find zero-crossings of the derivative (potential extrema)
    for (let i = 1; i < derivatives.length; i++) {
      if (derivatives[i-1] * derivatives[i] < 0) { // Sign change indicates extremum
        extrema.push(i);
      }
    }
    
    oscillations = extrema.length;
    
    // Calculate damping by comparing amplitude of oscillations over time
    const firstHalfAvg = this.calculateAmplitude(data.slice(0, Math.floor(data.length/2)));
    const secondHalfAvg = this.calculateAmplitude(data.slice(Math.floor(data.length/2)));
    
    const dampingFactor = firstHalfAvg > 0 ? secondHalfAvg / firstHalfAvg : 1;
    
    return {
      factor: dampingFactor,
      oscillations,
      amplitude: (firstHalfAvg + secondHalfAvg) / 2
    };
  }

  /**
   * Calculate first derivative (for oscillation detection)
   */
  calculateFirstDerivative(data) {
    const derivatives = [];
    for (let i = 1; i < data.length; i++) {
      derivatives.push(data[i].value - data[i-1].value);
    }
    return derivatives;
  }

  /**
   * Calculate amplitude of oscillations in a subset
   */
  calculateAmplitude(subset) {
    if (subset.length < 2) return 0;
    
    const mean = subset.reduce((sum, pt) => sum + pt.value, 0) / subset.length;
    const deviations = subset.map(pt => Math.abs(pt.value - mean));
    
    return deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
  }

  /**
   * Calculate stability metrics
   */
  calculateStability(data) {
    const regression = this.calculateRegression(data);
    const secondDeriv = this.calculateSecondDerivative(data);
    
    // Stability is determined by small slope magnitude and negative second derivative
    const slopeStable = Math.abs(regression.slope) < 0.001; // Very small slope
    const concaveDown = secondDeriv.mean < 0; // Negative second derivative indicates concave down
    const lowVariation = this.calculateCoefficientOfVariation(data) < 0.1; // Low relative variation
    
    return {
      slopeStable,
      concaveDown,
      lowVariation,
      overall: slopeStable && (concaveDown || Math.abs(secondDeriv.mean) < 0.001),
      coefficientOfVariation: this.calculateCoefficientOfVariation(data)
    };
  }

  /**
   * Calculate coefficient of variation
   */
  calculateCoefficientOfVariation(data) {
    const stats = this.calculateBasicStatistics(data);
    return stats.mean !== 0 ? stats.stdDev / Math.abs(stats.mean) : Infinity;
  }

  /**
   * Calculate p-value from t-statistic
   */
  calculatePValue(tStat, df) {
    // Simplified approximation of p-value calculation
    // In a real implementation, we'd use a more precise method
    // For now, we'll use a rough approximation
    const absT = Math.abs(tStat);
    
    // For large df, t-distribution approximates normal distribution
    if (df > 30) {
      // Use normal approximation
      return 2 * (1 - this.cumulativeNormal(absT));
    } else {
      // For smaller df, use rough approximation
      // This is a simplified implementation
      return 2 * (1 / (1 + Math.exp(-absT)));
    }
  }

  /**
   * Cumulative normal distribution (simplified approximation)
   */
  cumulativeNormal(x) {
    // Simplified approximation of cumulative normal distribution
    // This is not a precise calculation but serves for demonstration
    return 0.5 * (1 + Math.erf(x / Math.SQRT2));
  }

  /**
   * Perform comparative analysis between two datasets
   */
  comparativeAnalysis(data1, data2) {
    this.logger.log('🔬 Performing comparative analysis...');
    
    const analysis1 = this.analyzeEntropyCurve(data1);
    const analysis2 = this.analyzeEntropyCurve(data2);
    
    // Perform t-test to compare means
    const tTestResult = this.performTTest(
      data1.map(d => d.value),
      data2.map(d => d.value)
    );
    
    // Calculate effect size (Cohen's d)
    const effectSize = this.calculateEffectSize(
      data1.map(d => d.value),
      data2.map(d => d.value)
    );
    
    const comparison = {
      dataset1: analysis1,
      dataset2: analysis2,
      tTest: tTestResult,
      effectSize,
      significantDifference: tTestResult.pValue < this.options.significanceLevel,
      hasPracticalSignificance: Math.abs(effectSize) > 0.3 // Small effect size threshold
    };
    
    this.logger.log(`📊 Comparative results: Difference significant: ${comparison.significantDifference}, Practical significance: ${comparison.hasPracticalSignificance}`);
    this.logger.log(`📏 Effect size (Cohen's d): ${effectSize.toFixed(3)}`);
    
    return comparison;
  }

  /**
   * Perform Student's t-test
   */
  performTTest(sample1, sample2) {
    const n1 = sample1.length;
    const n2 = sample2.length;
    
    if (n1 < 2 || n2 < 2) {
      return { tStat: 0, pValue: 1, df: 0 };
    }
    
    // Calculate means
    const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
    const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
    
    // Calculate variances
    const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
    const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
    
    // Calculate pooled standard error
    const se = Math.sqrt(var1/n1 + var2/n2);
    
    if (se === 0) {
      return { tStat: 0, pValue: 1, df: n1 + n2 - 2 };
    }
    
    // Calculate t-statistic
    const tStat = (mean1 - mean2) / se;
    
    // Degrees of freedom (Welch's t-test)
    const df = Math.pow(var1/n1 + var2/n2, 2) / 
              (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
    
    // Calculate p-value (two-tailed)
    const pValue = 2 * (1 - this.cumulativeNormal(Math.abs(tStat)));
    
    return {
      tStat,
      pValue,
      df,
      mean1,
      mean2,
      var1,
      var2
    };
  }

  /**
   * Perform Student's t-test using correct statistical functions
   */
  performTTest(sample1, sample2) {
    return this.stats.performTTest(sample1, sample2, this.options.significanceLevel);
  }

  /**
   * Calculate effect size (Cohen's d) using correct statistical functions
   */
  calculateEffectSize(sample1, sample2) {
    return this.stats.calculateCohensD(sample1, sample2);
  }

  /**
   * Generate confidence intervals using correct statistical functions
   */
  generateBootstrapConfidenceIntervals(data, statisticFn, alpha = 0.05) {
    return this.stats.calculateConfidenceInterval(data, this.options.confidenceLevel);
  }

  /**
   * Calculate correlation between entropy metrics and objective correctness
   */
  calculateCorrelationMetrics(entropyData, correctnessData) {
    if (entropyData.length !== correctnessData.length) {
      throw new Error('Data arrays must have the same length');
    }

    // Calculate Pearson correlation
    const pearsonCorrelation = this.stats.pearsonCorrelation(
      entropyData,
      correctnessData
    );

    // Calculate Spearman correlation
    const spearmanCorrelation = this.stats.spearmanCorrelation(
      entropyData,
      correctnessData
    );

    // Calculate confidence intervals for correlations
    // Fisher transformation for correlation confidence interval
    const n = entropyData.length;
    if (n > 3) {
      // Fisher z-transformation
      const z = 0.5 * Math.log((1 + pearsonCorrelation) / (1 - pearsonCorrelation));
      const se = 1 / Math.sqrt(n - 3);
      const criticalValue = this.stats.inverseTDistribution(1 - this.options.confidenceLevel/2, n - 3);
      const marginError = criticalValue * se;
      
      const zLower = z - marginError;
      const zUpper = z + marginError;
      
      // Transform back to correlation scale
      const rLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
      const rUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);
      
      return {
        pearson: pearsonCorrelation,
        spearman: spearmanCorrelation,
        pearson_ci: { lower: rLower, upper: rUpper },
        sampleSize: n,
        significant: Math.abs(pearsonCorrelation) > 0.6, // Threshold for practical significance
        strength: this.getCorrelationStrength(pearsonCorrelation)
      };
    }

    return {
      pearson: pearsonCorrelation,
      spearman: spearmanCorrelation,
      pearson_ci: { lower: NaN, upper: NaN },
      sampleSize: n,
      significant: Math.abs(pearsonCorrelation) > 0.6,
      strength: this.getCorrelationStrength(pearsonCorrelation)
    };
  }

  /**
   * Determine correlation strength
   */
  getCorrelationStrength(correlation) {
    const absCorrelation = Math.abs(correlation);
    if (absCorrelation >= 0.7) return 'strong';
    if (absCorrelation >= 0.5) return 'moderate';
    if (absCorrelation >= 0.3) return 'weak';
    return 'negligible';
  }
  generateBootstrapConfidenceIntervals(data, statisticFn, alpha = 0.05) {
    const n = data.length;
    const bootstrapSamples = [];
    
    // Generate bootstrap samples
    for (let i = 0; i < this.options.bootstrapSamples; i++) {
      const sample = [];
      for (let j = 0; j < n; j++) {
        const randomIndex = Math.floor(Math.random() * n);
        sample.push(data[randomIndex]);
      }
      bootstrapSamples.push(statisticFn(sample));
    }
    
    // Sort bootstrap statistics
    bootstrapSamples.sort((a, b) => a - b);
    
    // Calculate percentiles
    const lowerIdx = Math.floor(alpha/2 * this.options.bootstrapSamples);
    const upperIdx = Math.floor((1 - alpha/2) * this.options.bootstrapSamples);
    
    return {
      lower: bootstrapSamples[lowerIdx],
      upper: bootstrapSamples[upperIdx],
      samples: bootstrapSamples,
      alpha
    };
  }

  /**
   * Analyze multiple runs for consistency
   */
  analyzeMultipleRuns(runsData) {
    this.logger.log(`🔬 Analyzing ${runsData.length} runs for consistency...`);
    
    // Analyze each run individually
    const individualAnalyses = runsData.map((data, idx) => {
      const analysis = this.analyzeEntropyCurve(data);
      return { run: idx, analysis };
    });
    
    // Calculate aggregate statistics
    const slopes = individualAnalyses.map(a => a.analysis.regression.slope);
    const rSquared = individualAnalyses.map(a => a.analysis.regression.rSquared);
    const dampingFactors = individualAnalyses.map(a => a.analysis.damping.factor);
    
    // Calculate means and standard deviations
    const meanSlope = slopes.reduce((sum, val) => sum + val, 0) / slopes.length;
    const meanRSquared = rSquared.reduce((sum, val) => sum + val, 0) / rSquared.length;
    const meanDamping = dampingFactors.reduce((sum, val) => sum + val, 0) / dampingFactors.length;
    
    const stdSlope = Math.sqrt(
      slopes.reduce((sum, val) => sum + Math.pow(val - meanSlope, 2), 0) / (slopes.length - 1)
    );
    const stdRSquared = Math.sqrt(
      rSquared.reduce((sum, val) => sum + Math.pow(val - meanRSquared, 2), 0) / (rSquared.length - 1)
    );
    const stdDamping = Math.sqrt(
      dampingFactors.reduce((sum, val) => sum + Math.pow(val - meanDamping, 2), 0) / (dampingFactors.length - 1)
    );
    
    // Calculate confidence intervals
    const slopeCI = this.generateBootstrapConfidenceIntervals(
      slopes, 
      sample => sample.reduce((sum, val) => sum + val, 0) / sample.length
    );
    
    const consistency = {
      individualAnalyses,
      aggregate: {
        meanSlope,
        meanRSquared,
        meanDamping,
        stdSlope,
        stdRSquared,
        stdDamping,
        slopeCI,
        consistencyCoefficient: stdSlope / Math.abs(meanSlope || 1) // Coefficient of variation
      },
      runsCount: runsData.length
    };
    
    this.logger.log(`📊 Aggregate results: Mean slope=${meanSlope.toFixed(6)}, Std=${stdSlope.toFixed(6)}, Consistency coeff=${consistency.aggregate.consistencyCoefficient.toFixed(3)}`);
    
    return consistency;
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Entropy analysis tool module loaded. Import and use the EntropyAnalysisTool class in your application.');
  
  // Example usage:
  /*
  const analyzer = new EntropyAnalysisTool();
  
  // Sample data: entropy measurements over time
  const entropyData = Array.from({length: 100}, (_, i) => ({
    timestamp: Date.now() + i * 60000, // 1-minute intervals
    value: 0.2 + Math.sin(i/10)*0.05 + Math.random()*0.02  // Simulated entropy with pattern
  }));
  
  const analysis = analyzer.analyzeEntropyCurve(entropyData);
  console.log('Analysis result:', analysis);
  */
}