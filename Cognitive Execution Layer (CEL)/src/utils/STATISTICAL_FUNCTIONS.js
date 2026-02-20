/**
 * Correct Statistical Functions for Entropy Analysis
 * Implements proper t-distribution, p-value calculation, and statistical tests
 */

export class StatisticalFunctions {
  constructor() {
    // For t-distribution calculations, we'll implement the correct formulas
  }

  /**
   * Calculate factorial using Stirling's approximation for large numbers
   */
  factorial(n) {
    if (n < 2) return 1;
    if (n < 171) {
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return result;
    }
    // Use Stirling's approximation for large factorials
    return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n);
  }

  /**
   * Calculate the gamma function using Lanczos approximation
   */
  gamma(x) {
    // Coefficients for Lanczos approximation
    const g = 7;
    const p = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (x < 0.5) {
      return Math.PI / (Math.sin(Math.PI * x) * this.gamma(1 - x));
    }

    x -= 1;
    let a = p[0];
    let t = x + g + 0.5;

    for (let i = 1; i < p.length; i++) {
      a += p[i] / (x + i);
    }

    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }

  /**
   * Calculate beta function
   */
  beta(x, y) {
    return (this.gamma(x) * this.gamma(y)) / this.gamma(x + y);
  }

  /**
   * Calculate regularized incomplete beta function
   */
  regularizedIncompleteBeta(x, a, b) {
    if (x === 0) return 0;
    if (x === 1) return 1;

    // Continued fraction representation
    const lbeta_ab = Math.log(this.beta(a, b));
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta_ab) / a;

    let c = 1;
    let d = 1 - (a + b) * x / (a + 1);

    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let result = d;

    for (let i = 1; i <= 200; i++) {
      const m = i / 2;
      let numerator;
      if (i % 2 === 0) {
        numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
      } else {
        numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
      }

      d = 1 + numerator * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + numerator / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const cd = c * d;
      result *= cd;
      if (Math.abs(cd - 1) < 1e-10) break;
    }

    return front * result;
  }

  /**
   * Calculate t-distribution CDF using regularized incomplete beta function
   */
  tDistributionCDF(t, df) {
    const x = df / (df + t * t);
    const betaVal = this.regularizedIncompleteBeta(x, df / 2, 0.5);
    const result = 0.5 * betaVal;

    if (t > 0) {
      return 1 - result;
    }
    return result;
  }

  /**
   * Calculate p-value from t-statistic and degrees of freedom
   */
  calculatePValue(tStat, df) {
    // Two-tailed test
    const absT = Math.abs(tStat);
    const lowerTail = this.tDistributionCDF(-absT, df);
    const upperTail = 1 - this.tDistributionCDF(absT, df);
    return lowerTail + upperTail;
  }

  /**
   * Calculate confidence interval for mean
   */
  calculateConfidenceInterval(data, confidenceLevel = 0.95) {
    const n = data.length;
    if (n < 2) {
      return { mean: data[0] || 0, lower: data[0] || 0, upper: data[0] || 0 };
    }

    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const stdErr = stdDev / Math.sqrt(n);

    const alpha = 1 - confidenceLevel;
    const criticalValue = this.inverseTDistribution(1 - alpha/2, n - 1);

    const marginError = criticalValue * stdErr;
    const lower = mean - marginError;
    const upper = mean + marginError;

    return {
      mean,
      lower,
      upper,
      stdErr,
      criticalValue
    };
  }

  /**
   * Inverse t-distribution (quantile function)
   * Using iterative approximation
   */
  inverseTDistribution(prob, df) {
    // For df > 30, t-distribution approximates normal distribution
    if (df > 30) {
      return this.inverseNormalDistribution(prob);
    }

    // For small df, use iterative approach
    let x = 0;
    let step = 0.1;
    const precision = 1e-6;

    // Newton-Raphson method to find the quantile
    for (let i = 0; i < 100; i++) {
      const currentProb = this.tDistributionCDF(x, df);
      const error = currentProb - prob;

      if (Math.abs(error) < precision) break;

      // Numerical derivative of CDF gives PDF
      const h = 1e-8;
      const pdf = (this.tDistributionCDF(x + h, df) - this.tDistributionCDF(x - h, df)) / (2 * h);

      if (pdf === 0) break;

      x = x - error / pdf;
    }

    return x;
  }

  /**
   * Inverse normal distribution using Beasley-Springer-Moro algorithm
   */
  inverseNormalDistribution(p) {
    if (p <= 0 || p >= 1) {
      throw new Error("Probability must be between 0 and 1 (exclusive)");
    }

    if (p === 0.5) return 0;

    const q = p - 0.5;
    let r;

    if (Math.abs(q) <= 0.425) {
      r = 0.180625 - q * q;
      return q * 
        (((((((2.5090809287301226727e+3 * r +
        3.3430575583588128105e+4) * r +
        6.7265770927008700853e+4) * r +
        4.5921953931549871457e+4) * r +
        1.3731693765509461125e+4) * r +
        1.9715909503065514427e+3) * r +
        1.3314166789178437745e+2) * r +
        3.3871328727963666080e+0) /
        (((((((5.2264952788528545610e+3 * r +
          2.8729085735721942674e+4) * r +
          3.9307895800092710610e+4) * r +
          2.1213794301586595867e+4) * r +
          5.3941960214247511077e+3) * r +
          6.8718700749205790830e+2) * r +
          4.2313330701600911252e+1) * r +
          1.0));
    }

    r = (p < 0.5) ? p : 1 - p;
    r = Math.sqrt(-Math.log(r));

    if (r <= 5) {
      r = r - 1.6;
      return (((((((7.74545014278341407640e-4 * r +
        2.27238449892691845833e-2) * r +
        2.41780725177450611770e-1) * r +
        1.27045825245236838258e+0) * r +
        2.93050564871477343995e+0) * r +
        2.33785190592335092050e+0) * r +
        2.1213794301586595867e-1) /
        ((((((4.40413822776671604055e-4 * r +
          3.13082679827601870778e-2) * r +
          6.61181055224396581785e-1) * r +
          4.08786886309133642340e+0) * r +
          8.97057926506037555393e+0) * r +
          6.93963595393650688503e+0) * r +
          1.0));
    }

    r = r - 5;
    return (((((((2.01033439929228813265e-7 * r +
      2.71155556874348757815e-5) * r +
      1.24266094738807843860e-3) * r +
      2.65321895265761230930e-2) * r +
      2.96560571828504891230e-1) * r +
      1.78482637930162765937e+0) * r +
      5.46378491116411436990e+0) * r +
      6.65790464350110377720e+0) /
      ((((((2.04426310338993978564e-15 * r +
        1.42151175831644588870e-7) * r +
        1.84631831751005468180e-5) * r +
        7.86869131145613259100e-4) * r +
        1.48753612908506148525e-2) * r +
        1.36929880922735805310e-1) * r +
        5.99832206555887937690e-1) * r +
        1.0));
  }

  /**
   * Perform Student's t-test for comparing two samples
   */
  performTTest(sample1, sample2, alpha = 0.05) {
    const n1 = sample1.length;
    const n2 = sample2.length;

    if (n1 < 2 || n2 < 2) {
      return { 
        tStat: 0, 
        pValue: 1, 
        df: 0, 
        significant: false,
        ci_diff: { lower: 0, upper: 0 }
      };
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
      return { 
        tStat: 0, 
        pValue: 1, 
        df: n1 + n2 - 2, 
        significant: false,
        ci_diff: { lower: 0, upper: 0 }
      };
    }

    // Calculate t-statistic
    const tStat = (mean1 - mean2) / se;

    // Degrees of freedom (Welch's t-test)
    const df = Math.pow(var1/n1 + var2/n2, 2) / 
              (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));

    // Calculate p-value (two-tailed)
    const pValue = this.calculatePValue(tStat, df);

    // Calculate confidence interval for difference in means
    const criticalValue = this.inverseTDistribution(1 - alpha/2, df);
    const marginError = criticalValue * se;
    const diff = mean1 - mean2;

    return {
      tStat,
      pValue,
      df,
      mean1,
      mean2,
      var1,
      var2,
      significant: pValue < alpha,
      ci_diff: {
        lower: diff - marginError,
        upper: diff + marginError
      }
    };
  }

  /**
   * Calculate effect size (Cohen's d)
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
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Calculate Spearman rank correlation
   */
  spearmanCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }

    // Create ranked arrays
    const xWithIndex = x.map((val, idx) => ({ val, idx }));
    const yWithIndex = y.map((val, idx) => ({ val, idx }));

    // Sort by value to assign ranks
    const xRanked = [...xWithIndex].sort((a, b) => a.val - b.val);
    const yRanked = [...yWithIndex].sort((a, b) => a.val - b.val);

    // Assign ranks (handling ties)
    this.assignRanks(xRanked);
    this.assignRanks(yRanked);

    // Create array with ranks aligned by original index
    const xRanks = new Array(x.length);
    const yRanks = new Array(y.length);

    for (let i = 0; i < x.length; i++) {
      xRanks[xWithIndex[i].idx] = xRanked.findIndex(item => item.idx === xWithIndex[i].idx) + 1;
      yRanks[yWithIndex[i].idx] = yRanked.findIndex(item => item.idx === yWithIndex[i].idx) + 1;
    }

    // Calculate Pearson correlation on ranks
    return this.pearsonCorrelation(xRanks, yRanks);
  }

  /**
   * Assign ranks to sorted array, handling ties
   */
  assignRanks(arr) {
    let rank = 1;
    for (let i = 0; i < arr.length; i++) {
      // Check for ties
      let j = i;
      while (j < arr.length - 1 && arr[j + 1].val === arr[i].val) {
        j++;
      }

      // If there are ties, assign average rank
      if (j > i) {
        const avgRank = (rank + rank + (j - i)) / 2;
        for (let k = i; k <= j; k++) {
          arr[k].rank = avgRank;
        }
        rank += (j - i + 1);
        i = j;
      } else {
        arr[i].rank = rank;
        rank++;
      }
    }
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Statistical functions module loaded. Import and use the StatisticalFunctions class in your application.');
  
  // Example usage:
  /*
  const stats = new StatisticalFunctions();
  
  // Test t-distribution
  console.log('t-distribution CDF(1.96, 30):', stats.tDistributionCDF(1.96, 30));
  console.log('p-value for t=2.1, df=20:', stats.calculatePValue(2.1, 20));
  
  // Test t-test
  const sample1 = [1, 2, 3, 4, 5];
  const sample2 = [2, 3, 4, 5, 6];
  console.log('T-test result:', stats.performTTest(sample1, sample2));
  */
}