#!/usr/bin/env node

import { ValidationSuite } from './validation-suite.js';

/**
 * Script to run the LLM Control Plane validation suite
 * Can be called directly from command line or as part of CI/CD pipeline
 */

async function runValidation() {
  console.log('🔬 Running LLM Control Plane Validation Suite...\n');
  
  const startTime = Date.now();
  
  try {
    const suite = new ValidationSuite();
    const results = await suite.runAllTests();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n⏱️  Total execution time: ${duration}ms`);
    
    // Exit with appropriate code based on results
    const exitCode = results.failed > 0 ? 1 : 0;
    
    console.log(`\n🏁 Validation suite completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Error running validation suite:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}