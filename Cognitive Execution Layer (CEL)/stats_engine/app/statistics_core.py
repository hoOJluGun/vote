from typing import List, Dict, Union
import numpy as np
from scipy import stats
from scipy.stats import pearsonr, spearmanr
from scipy.special import betainc
import warnings
warnings.filterwarnings('ignore')

class StatisticsCore:
    """
    Formally validated statistical functions for entropy analysis and cognitive workspace validation
    Uses SciPy and NumPy for numerically stable computations
    """

    @staticmethod
    def welch_ttest(sample_a: List[float], sample_b: List[float]) -> Dict[str, float]:
        """
        Perform Welch's t-test for two independent samples
        Accounts for potentially unequal variances and sample sizes
        """
        sample_a = np.array(sample_a)
        sample_b = np.array(sample_b)

        # Perform Welch's t-test using scipy
        t_stat, p_value = stats.ttest_ind(sample_a, sample_b, equal_var=False)

        # Calculate degrees of freedom using Welch-Satterthwaite equation
        var_a = np.var(sample_a, ddof=1)
        var_b = np.var(sample_b, ddof=1)
        n_a = len(sample_a)
        n_b = len(sample_b)

        numerator = (var_a / n_a + var_b / n_b) ** 2
        denominator = ((var_a / n_a) ** 2) / (n_a - 1) + ((var_b / n_b) ** 2) / (n_b - 1)
        df = numerator / denominator

        # Calculate effect size (Cohen's d)
        pooled_std = np.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / (n_a + n_b - 2))
        cohens_d = (np.mean(sample_a) - np.mean(sample_b)) / pooled_std if pooled_std != 0 else 0

        return {
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "degrees_of_freedom": float(df),
            "cohens_d": float(cohens_d),
            "mean_a": float(np.mean(sample_a)),
            "mean_b": float(np.mean(sample_b)),
            "std_a": float(np.std(sample_a)),
            "std_b": float(np.std(sample_b))
        }

    @staticmethod
    def onesample_ttest(sample: List[float], population_mean: float = 0.0) -> Dict[str, float]:
        """
        Perform one-sample t-test against population mean
        """
        sample = np.array(sample)
        t_stat, p_value = stats.ttest_1samp(sample, population_mean)

        # Calculate effect size (Cohen's d)
        std_dev = np.std(sample, ddof=1)
        cohens_d = (np.mean(sample) - population_mean) / std_dev if std_dev != 0 else 0

        return {
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "degrees_of_freedom": len(sample) - 1,
            "cohens_d": float(cohens_d),
            "sample_mean": float(np.mean(sample)),
            "population_mean": float(population_mean),
            "sample_std": float(std_dev)
        }

    @staticmethod
    def pearson_correlation(a: List[float], b: List[float]) -> Dict[str, float]:
        """
        Calculate Pearson correlation coefficient with p-value
        """
        a = np.array(a)
        b = np.array(b)

        if len(a) != len(b):
            raise ValueError("Arrays must have the same length")

        if len(a) < 2:
            raise ValueError("Need at least 2 data points for correlation")

        r, p_value = pearsonr(a, b)

        # Calculate confidence interval for correlation using Fisher transformation
        n = len(a)
        if abs(r) < 0.99:  # Avoid issues with perfect correlation
            z = 0.5 * np.log((1 + r) / (1 - r))  # Fisher z-transform
            se = 1 / np.sqrt(n - 3)
            # 95% confidence interval
            z_lower = z - 1.96 * se
            z_upper = z + 1.96 * se
            # Transform back
            r_lower = (np.exp(2 * z_lower) - 1) / (np.exp(2 * z_lower) + 1)
            r_upper = (np.exp(2 * z_upper) - 1) / (np.exp(2 * z_upper) + 1)
        else:
            # Perfect correlation
            r_lower, r_upper = r, r

        return {
            "correlation": float(r),
            "p_value": float(p_value),
            "n": int(n),
            "ci_lower": float(r_lower),
            "ci_upper": float(r_upper)
        }

    @staticmethod
    def spearman_correlation(a: List[float], b: List[float]) -> Dict[str, float]:
        """
        Calculate Spearman rank correlation coefficient with p-value
        """
        a = np.array(a)
        b = np.array(b)

        if len(a) != len(b):
            raise ValueError("Arrays must have the same length")

        if len(a) < 2:
            raise ValueError("Need at least 2 data points for correlation")

        rho, p_value = spearmanr(a, b)

        # Calculate confidence interval for correlation using Fisher transformation
        n = len(a)
        if abs(rho) < 0.99:  # Avoid issues with perfect correlation
            z = 0.5 * np.log((1 + rho) / (1 - rho))  # Fisher z-transform
            se = 1 / np.sqrt(n - 3)
            # 95% confidence interval
            z_lower = z - 1.96 * se
            z_upper = z + 1.96 * se
            # Transform back
            rho_lower = (np.exp(2 * z_lower) - 1) / (np.exp(2 * z_lower) + 1)
            rho_upper = (np.exp(2 * z_upper) - 1) / (np.exp(2 * z_upper) + 1)
        else:
            # Perfect correlation
            rho_lower, rho_upper = rho, rho

        return {
            "correlation": float(rho),
            "p_value": float(p_value),
            "n": int(n),
            "ci_lower": float(rho_lower),
            "ci_upper": float(rho_upper)
        }

    @staticmethod
    def both_correlations(a: List[float], b: List[float]) -> Dict[str, Dict[str, float]]:
        """
        Calculate both Pearson and Spearman correlations
        """
        return {
            "pearson": StatisticsCore.pearson_correlation(a, b),
            "spearman": StatisticsCore.spearman_correlation(a, b)
        }

    @staticmethod
    def bootstrap_mean_ci(data: List[float], n_boot: int = 10000, alpha: float = 0.05) -> Dict[str, float]:
        """
        Calculate bootstrap confidence interval for mean
        """
        data = np.array(data)
        n = len(data)
        boot_means = []

        # Perform bootstrap sampling
        for _ in range(n_boot):
            sample = np.random.choice(data, size=n, replace=True)
            boot_means.append(np.mean(sample))

        # Calculate confidence interval
        lower_percentile = 100 * alpha / 2
        upper_percentile = 100 * (1 - alpha / 2)

        ci_lower = np.percentile(boot_means, lower_percentile)
        ci_upper = np.percentile(boot_means, upper_percentile)

        original_mean = np.mean(data)

        return {
            "original_mean": float(original_mean),
            "ci_lower": float(ci_lower),
            "ci_upper": float(ci_upper),
            "n_bootstrap": int(n_boot),
            "alpha": float(alpha),
            "bootstrap_se": float(np.std(boot_means))
        }

    @staticmethod
    def cohens_d(sample_a: List[float], sample_b: List[float]) -> Dict[str, float]:
        """
        Calculate Cohen's d effect size for two samples
        """
        sample_a = np.array(sample_a)
        sample_b = np.array(sample_b)

        mean_a = np.mean(sample_a)
        mean_b = np.mean(sample_b)

        n_a = len(sample_a)
        n_b = len(sample_b)

        var_a = np.var(sample_a, ddof=1)
        var_b = np.var(sample_b, ddof=1)

        # Calculate pooled standard deviation
        pooled_std = np.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / (n_a + n_b - 2))

        # Calculate Cohen's d
        d = (mean_a - mean_b) / pooled_std if pooled_std != 0 else 0

        # Calculate Hedge's g (bias corrected)
        correction_factor = 1 - (3 / (4 * (n_a + n_b) - 9))
        hedge_g = d * correction_factor

        return {
            "cohens_d": float(d),
            "hedges_g": float(hedge_g),
            "mean_a": float(mean_a),
            "mean_b": float(mean_b),
            "pooled_std": float(pooled_std)
        }

    @staticmethod
    def confidence_interval(sample: List[float], confidence_level: float = 0.95) -> Dict[str, float]:
        """
        Calculate standard confidence interval for sample mean
        """
        sample = np.array(sample)
        n = len(sample)
        sample_mean = np.mean(sample)
        sample_std = np.std(sample, ddof=1)

        # Calculate critical value from t-distribution
        alpha = 1 - confidence_level
        critical_value = stats.t.ppf(1 - alpha/2, df=n-1)

        # Calculate margin of error
        se = sample_std / np.sqrt(n)
        margin_error = critical_value * se

        ci_lower = sample_mean - margin_error
        ci_upper = sample_mean + margin_error

        return {
            "sample_mean": float(sample_mean),
            "sample_std": float(sample_std),
            "confidence_level": float(confidence_level),
            "critical_value": float(critical_value),
            "margin_error": float(margin_error),
            "ci_lower": float(ci_lower),
            "ci_upper": float(ci_upper),
            "n": int(n)
        }

    @staticmethod
    def power_analysis(effect_size: float, n1: int, n2: int = None, alpha: float = 0.05) -> Dict[str, float]:
        """
        Calculate statistical power for two-sample t-test
        """
        from scipy.stats import nct
        
        if n2 is None:
            n2 = n1  # Equal sample sizes if not specified
            
        # Calculate lambda (non-centrality parameter)
        lambda_param = effect_size * np.sqrt((n1 * n2) / (n1 + n2))
        
        # Calculate degrees of freedom
        df = n1 + n2 - 2
        
        # Calculate critical t-value for given alpha
        t_critical = stats.t.ppf(1 - alpha/2, df)
        
        # Calculate power using non-central t-distribution
        power = 1 - nct.cdf(t_critical, df, lambda_param) + nct.cdf(-t_critical, df, lambda_param)
        
        return {
            "power": float(power),
            "effect_size": float(effect_size),
            "n1": int(n1),
            "n2": int(n2),
            "alpha": float(alpha),
            "lambda": float(lambda_param),
            "df": int(df),
            "t_critical": float(t_critical)
        }

    @staticmethod
    def bayesian_ttest(sample_a: List[float], sample_b: List[float]) -> Dict[str, Union[float, str]]:
        """
        Perform Bayesian t-test using PyMC equivalent approach
        """
        # Using scipy to approximate Bayesian t-test
        # This is a simplified version using confidence intervals and effect size
        sample_a = np.array(sample_a)
        sample_b = np.array(sample_b)
        
        n_a, n_b = len(sample_a), len(sample_b)
        mean_a, mean_b = np.mean(sample_a), np.mean(sample_b)
        var_a, var_b = np.var(sample_a, ddof=1), np.var(sample_b, ddof=1)
        
        # Calculate standard error of difference
        se_diff = np.sqrt(var_a/n_a + var_b/n_b)
        
        # Calculate t-statistic
        t_stat = (mean_a - mean_b) / se_diff
        
        # Calculate degrees of freedom (Welch-Satterthwaite)
        df = (var_a/n_a + var_b/n_b)**2 / ((var_a/n_a)**2/(n_a-1) + (var_b/n_b)**2/(n_b-1))
        
        # Calculate p-value (for reference)
        p_value = 2 * (1 - stats.t.cdf(np.abs(t_stat), df))
        
        # Approximate Bayes Factor using t-statistic and sample sizes
        # This is based on the approximation by Wetzels & Wagenmakers (2012)
        n_total = n_a + n_b
        log_bf = np.log(np.sqrt(n_a * n_b / (n_a + n_b))) + (df / 2) * np.log(1 + t_stat**2 / df)
        bf_01 = np.exp(log_bf)  # Bayes Factor in favor of null hypothesis
        bf_10 = 1 / bf_01       # Bayes Factor in favor of alternative hypothesis
        
        # Determine evidence strength based on BF
        evidence_str = "anecdotal"
        if bf_10 > 100:
            evidence_str = "decisive"
        elif bf_10 > 32:
            evidence_str = "very strong"
        elif bf_10 > 10:
            evidence_str = "strong"
        elif bf_10 > 3:
            evidence_str = "moderate"
        elif bf_10 > 1:
            evidence_str = "anecdotal"
        else:
            bf_10, bf_01 = bf_01, bf_10
            evidence_str = "anecdotal"
            if bf_10 > 100:
                evidence_str = "decisive"
            elif bf_10 > 32:
                evidence_str = "very strong"
            elif bf_10 > 10:
                evidence_str = "strong"
            elif bf_10 > 3:
                evidence_str = "moderate"
            elif bf_10 > 1:
                evidence_str = "anecdotal"
        
        return {
            "bayes_factor_10": float(bf_10),  # BF10: data supports alternative
            "bayes_factor_01": float(bf_01),  # BF01: data supports null
            "evidence_strength": evidence_str,
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "mean_diff": float(mean_a - mean_b),
            "cohens_d": float((mean_a - mean_b) / np.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / (n_a + n_b - 2)))
        }