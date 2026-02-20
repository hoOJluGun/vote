import { runStressTests } from './validation/stress-tests.js';
import { runDeterminismTests } from './validation/determinism-tests.js';
import { runSafetyTests } from './validation/safety-tests.js';
import { runConflictTests } from './validation/conflict-tests.js';
import { runEntropyTests } from './validation/entropy-tests.js';

/**
 * Main validation suite runner for LLM Control Plane
 * Coordinates all test categories and reports results
 */
export class ValidationSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      categories: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting LLM Control Plane Validation Suite...\n');
    
    // Run each test category
    await this.runCategory('Stress Tests', runStressTests);
    await this.runCategory('Determinism Tests', runDeterminismTests);
    await this.runCategory('Safety Tests', runSafetyTests);
    await this.runCategory('Conflict Tests', runConflictTests);
    await this.runCategory('Entropy Tests', runEntropyTests);

    // Print final summary
    this.printSummary();
    
    return this.results;
  }

  async runCategory(name, testRunner) {
    console.log(`📋 Running ${name}...`);
    
    try {
      const startTime = Date.now();
      const categoryResults = await testRunner();
      const endTime = Date.now();
      
      // Process results
      const passed = categoryResults.filter(r => r.passed).length;
      const failed = categoryResults.filter(r => !r.passed).length;
      const totalTime = endTime - startTime;
      
      // Update global results
      this.results.passed += passed;
      this.results.failed += failed;
      this.results.total += categoryResults.length;
      
      // Store category results
      this.results.categories[name] = {
        passed,
        failed,
        total: categoryResults.length,
        tests: categoryResults,
        duration: totalTime
      };

      console.log(`✅ ${name}: ${passed} passed, ${failed} failed (${totalTime}ms)\n`);
      
      // Print failures if any
      if (failed > 0) {
        console.log('❌ Failed tests:');
        categoryResults.forEach(test => {
          if (!test.passed) {
            console.log(`   - ${test.name}: ${test.error || 'Unknown error'}`);
          }
        });
        console.log('');
      }
    } catch (error) {
      console.error(`💥 Error running ${name}:`, error.message);
      
      // Update global results for error case
      this.results.failed += 1;
      this.results.total += 1;
      
      this.results.categories[name] = {
        passed: 0,
        failed: 1,
        total: 1,
        error: error.message,
        duration: 0
      };
    }
  }

  printSummary() {
    console.log('📊 Validation Suite Results Summary');
    console.log('=================================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! System validation successful.');
    } else {
      console.log(`\n⚠️  ${this.results.failed} test(s) failed. Please review and fix.`);
    }
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new ValidationSuite();
  suite.runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Validation suite failed with error:', error);
      process.exit(1);
    });
}