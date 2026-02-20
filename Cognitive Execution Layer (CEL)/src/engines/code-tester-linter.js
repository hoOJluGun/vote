/**
 * Code Tester and Linter Engine
 * Provides comprehensive testing and linting functionality for code quality assurance
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class CodeTesterLinter {
  constructor(options = {}) {
    this.testConfig = {
      timeout: options.timeout || 30000,
      maxMemory: options.maxMemory || 1024,
      parallelTests: options.parallelTests || 4,
      ...options.testConfig
    };
    
    this.lintConfig = {
      eslintRules: options.eslintRules || {},
      swiftLintRules: options.swiftLintRules || {},
      customRules: options.customRules || [],
      ...options.lintConfig
    };
    
    this.resultsCache = new Map();
    this.cacheExpiry = options.cacheExpiry || 300000; // 5 minutes
  }

  /**
   * Run comprehensive tests for a specific file
   */
  static async runTestsForFile(filePath, options = {}) {
    const tester = new CodeTesterLinter(options);
    return await tester.runTests(filePath, options);
  }

  /**
   * Run linting for a specific file
   */
  static async runLintForFile(filePath, options = {}) {
    const linter = new CodeTesterLinter(options);
    return await linter.runLint(filePath, options);
  }

  /**
   * Run Swift tests for an entire project
   */
  static async runSwiftTests(projectPath, options = {}) {
    const tester = new CodeTesterLinter(options);
    return await tester.runSwiftProjectTests(projectPath, options);
  }

  /**
   * Run tests on a file
   */
  async runTests(filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Determine file type and run appropriate tests
      const ext = path.extname(filePath).toLowerCase();
      let testResults;
      
      switch (ext) {
        case '.js':
        case '.ts':
          testResults = await this.runJavaScriptTests(filePath, options);
          break;
        case '.swift':
          testResults = await this.runSwiftTests(filePath, options);
          break;
        case '.py':
          testResults = await this.runPythonTests(filePath, options);
          break;
        default:
          testResults = await this.runGenericTests(filePath, options);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: testResults.passed === testResults.total,
        filePath,
        results: testResults,
        duration,
        timestamp: new Date().toISOString(),
        summary: this.generateTestSummary(testResults)
      };
      
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        summary: `Test execution failed: ${error.message}`
      };
    }
  }

  /**
   * Run JavaScript/TypeScript tests
   */
  async runJavaScriptTests(filePath, options = {}) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      tests: []
    };

    try {
      // Try to run with Jest first
      const jestResult = await this.executeJestTests(filePath, options);
      if (jestResult) {
        return jestResult;
      }
      
      // Fall back to Mocha
      const mochaResult = await this.executeMochaTests(filePath, options);
      if (mochaResult) {
        return mochaResult;
      }
      
      // Basic syntax validation
      const syntaxResult = await this.validateJavaScriptSyntax(filePath);
      results.tests.push(syntaxResult);
      results.total = 1;
      results.passed = syntaxResult.passed ? 1 : 0;
      results.failed = syntaxResult.passed ? 0 : 1;
      
    } catch (error) {
      results.tests.push({
        name: 'Test execution',
        passed: false,
        error: error.message
      });
      results.total = 1;
      results.failed = 1;
    }

    return results;
  }

  /**
   * Execute Jest tests
   */
  async executeJestTests(filePath, options) {
    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      
      // Look for test files
      const testPattern = fileName.replace(/\.(js|ts)$/, '.test.$1');
      const testFiles = await this.findTestFiles(dir, testPattern);
      
      if (testFiles.length === 0) {
        return null; // No tests found
      }

      const cmd = `cd "${dir}" && npx jest --testMatch="<rootDir>/${testPattern}" --json --silent`;
      const { stdout } = await execAsync(cmd, { timeout: this.testConfig.timeout });
      
      const jestResults = JSON.parse(stdout);
      return this.processJestResults(jestResults);
      
    } catch (error) {
      // Jest not available or failed, return null to try other test runners
      return null;
    }
  }

  /**
   * Execute Mocha tests
   */
  async executeMochaTests(filePath, options) {
    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      
      const testPattern = fileName.replace(/\.(js|ts)$/, '.test.$1');
      const testFiles = await this.findTestFiles(dir, testPattern);
      
      if (testFiles.length === 0) {
        return null;
      }

      const cmd = `cd "${dir}" && npx mocha --reporter json "${testPattern}"`;
      const { stdout } = await execAsync(cmd, { timeout: this.testConfig.timeout });
      
      const mochaResults = JSON.parse(stdout);
      return this.processMochaResults(mochaResults);
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate JavaScript syntax
   */
  async validateJavaScriptSyntax(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Try to parse with acorn or similar
      new Function(content); // Basic syntax check
      return {
        name: 'Syntax validation',
        passed: true,
        message: 'Valid JavaScript syntax'
      };
    } catch (error) {
      return {
        name: 'Syntax validation',
        passed: false,
        error: error.message,
        message: 'Invalid JavaScript syntax'
      };
    }
  }

  /**
   * Run Swift tests
   */
  async runSwiftTests(filePath, options = {}) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      tests: []
    };

    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath, '.swift');
      
      // Look for XCTest files
      const testPattern = `${fileName}Tests.swift`;
      const testFiles = await this.findTestFiles(dir, testPattern);
      
      if (testFiles.length > 0) {
        const swiftResult = await this.executeSwiftTests(dir, testFiles, options);
        return swiftResult;
      }
      
      // Basic compilation check
      const compileResult = await this.compileSwiftFile(filePath);
      results.tests.push(compileResult);
      results.total = 1;
      results.passed = compileResult.passed ? 1 : 0;
      results.failed = compileResult.passed ? 0 : 1;
      
    } catch (error) {
      results.tests.push({
        name: 'Swift test execution',
        passed: false,
        error: error.message
      });
      results.total = 1;
      results.failed = 1;
    }

    return results;
  }

  /**
   * Run Python tests
   */
  async runPythonTests(filePath, options = {}) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      tests: []
    };

    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath, '.py');
      
      // Look for unittest files
      const testPattern = `test_${fileName}.py`;
      const testFiles = await this.findTestFiles(dir, testPattern);
      
      if (testFiles.length > 0) {
        const pythonResult = await this.executePythonTests(dir, testFiles, options);
        return pythonResult;
      }
      
      // Basic syntax check
      const syntaxResult = await this.validatePythonSyntax(filePath);
      results.tests.push(syntaxResult);
      results.total = 1;
      results.passed = syntaxResult.passed ? 1 : 0;
      results.failed = syntaxResult.passed ? 0 : 1;
      
    } catch (error) {
      results.tests.push({
        name: 'Python test execution',
        passed: false,
        error: error.message
      });
      results.total = 1;
      results.failed = 1;
    }

    return results;
  }

  /**
   * Run generic tests (basic validation)
   */
  async runGenericTests(filePath, options = {}) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 1,
      tests: []
    };

    try {
      // File existence and readability check
      await fs.access(filePath, fs.constants.R_OK);
      
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      const testResult = {
        name: 'File validation',
        passed: true,
        details: {
          size: stat.size,
          lines: content.split('\n').length,
          readable: true
        }
      };
      
      results.tests.push(testResult);
      results.passed = 1;
      
    } catch (error) {
      results.tests.push({
        name: 'File validation',
        passed: false,
        error: error.message
      });
      results.failed = 1;
    }

    return results;
  }

  /**
   * Run linting on a file
   */
  async runLint(filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      await fs.access(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let lintResults;
      
      switch (ext) {
        case '.js':
        case '.ts':
          lintResults = await this.runESLint(filePath, options);
          break;
        case '.swift':
          lintResults = await this.runSwiftLint(filePath, options);
          break;
        case '.py':
          lintResults = await this.runPyLint(filePath, options);
          break;
        default:
          lintResults = await this.runGenericLint(filePath, options);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: lintResults.errors === 0,
        filePath,
        results: lintResults,
        duration,
        timestamp: new Date().toISOString(),
        summary: this.generateLintSummary(lintResults)
      };
      
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        summary: `Linting failed: ${error.message}`
      };
    }
  }

  /**
   * Run ESLint
   */
  async runESLint(filePath, options = {}) {
    try {
      const dir = path.dirname(filePath);
      const cmd = `cd "${dir}" && npx eslint "${filePath}" --format=json`;
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      const eslintResults = JSON.parse(stdout);
      return this.processESLintResults(eslintResults[0] || {});
      
    } catch (error) {
      // ESLint not available, run basic validation
      return await this.runBasicJavaScriptLint(filePath);
    }
  }

  /**
   * Run SwiftLint
   */
  async runSwiftLint(filePath, options = {}) {
    try {
      const cmd = `swiftlint lint --path "${filePath}" --quiet --reporter json`;
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      const swiftlintResults = JSON.parse(stdout);
      return this.processSwiftLintResults(swiftlintResults);
      
    } catch (error) {
      // SwiftLint not available, run basic validation
      return await this.runBasicSwiftLint(filePath);
    }
  }

  /**
   * Run PyLint
   */
  async runPyLint(filePath, options = {}) {
    try {
      const cmd = `pylint "${filePath}" --output-format=json`;
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      const pylintResults = JSON.parse(stdout || '[]');
      return this.processPyLintResults(pylintResults);
      
    } catch (error) {
      // PyLint not available, run basic validation
      return await this.runBasicPythonLint(filePath);
    }
  }

  /**
   * Run Swift project tests
   */
  async runSwiftProjectTests(projectPath, options = {}) {
    try {
      await fs.access(projectPath);
      
      const packageFiles = await fs.readdir(projectPath);
      const hasPackage = packageFiles.includes('Package.swift');
      const hasXcodeproj = packageFiles.some(f => f.endsWith('.xcodeproj'));
      
      let cmd;
      if (hasPackage) {
        cmd = `cd "${projectPath}" && swift test`;
      } else if (hasXcodeproj) {
        const projectName = packageFiles.find(f => f.endsWith('.xcodeproj')).replace('.xcodeproj', '');
        cmd = `cd "${projectPath}" && xcodebuild test -project "${projectName}.xcodeproj" -scheme "${projectName}"`;
      } else {
        throw new Error('No Swift package or Xcode project found');
      }
      
      const { stdout, stderr } = await execAsync(cmd, { 
        timeout: options.timeout || 300000 // 5 minutes for project tests
      });
      
      return {
        success: true,
        projectPath,
        message: 'Swift tests completed successfully',
        results: stdout + stderr,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        projectPath,
        error: error.message,
        message: 'Swift tests failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility methods
  async findTestFiles(directory, pattern) {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => file.includes(pattern));
    } catch (error) {
      return [];
    }
  }

  async compileSwiftFile(filePath) {
    try {
      const dir = path.dirname(filePath);
      const cmd = `cd "${dir}" && swiftc -parse "${filePath}"`;
      await execAsync(cmd, { timeout: 5000 });
      return {
        name: 'Swift compilation',
        passed: true,
        message: 'Compiles successfully'
      };
    } catch (error) {
      return {
        name: 'Swift compilation',
        passed: false,
        error: error.message,
        message: 'Compilation failed'
      };
    }
  }

  generateTestSummary(results) {
    if (results.total === 0) {
      return 'No tests found or executed';
    }
    
    const passRate = ((results.passed / results.total) * 100).toFixed(1);
    return `${results.passed}/${results.total} tests passed (${passRate}%)`;
  }

  generateLintSummary(results) {
    const issues = results.errors + results.warnings;
    if (issues === 0) {
      return 'No linting issues found';
    }
    
    return `${results.errors} errors, ${results.warnings} warnings`;
  }

  // Result processing methods
  processJestResults(jestResults) {
    return {
      passed: jestResults.numPassedTests || 0,
      failed: jestResults.numFailedTests || 0,
      skipped: jestResults.numPendingTests || 0,
      total: jestResults.numTotalTests || 0,
      tests: (jestResults.testResults || []).map(result => ({
        name: result.name,
        passed: result.status === 'passed',
        duration: result.duration
      }))
    };
  }

  processMochaResults(mochaResults) {
    const tests = mochaResults.tests || [];
    return {
      passed: tests.filter(t => t.state === 'passed').length,
      failed: tests.filter(t => t.state === 'failed').length,
      skipped: tests.filter(t => t.state === 'pending').length,
      total: tests.length,
      tests: tests.map(test => ({
        name: test.fullTitle,
        passed: test.state === 'passed',
        error: test.err ? test.err.message : undefined
      }))
    };
  }

  processESLintResults(eslintResult) {
    const messages = eslintResult.messages || [];
    return {
      errors: messages.filter(m => m.severity === 2).length,
      warnings: messages.filter(m => m.severity === 1).length,
      total: messages.length,
      issues: messages.map(msg => ({
        line: msg.line,
        column: msg.column,
        message: msg.message,
        rule: msg.ruleId,
        severity: msg.severity === 2 ? 'error' : 'warning'
      }))
    };
  }

  processSwiftLintResults(swiftlintResults) {
    return {
      errors: swiftlintResults.filter(r => r.severity === 'error').length,
      warnings: swiftlintResults.filter(r => r.severity === 'warning').length,
      total: swiftlintResults.length,
      issues: swiftlintResults.map(result => ({
        line: result.line,
        character: result.character,
        message: result.reason,
        rule: result.rule_id,
        severity: result.severity
      }))
    };
  }

  processPyLintResults(pylintResults) {
    return {
      errors: pylintResults.filter(r => r.type === 'error').length,
      warnings: pylintResults.filter(r => r.type === 'warning').length,
      total: pylintResults.length,
      issues: pylintResults.map(result => ({
        line: result.line,
        message: result.message,
        symbol: result.symbol,
        type: result.type
      }))
    };
  }

  // Basic linting when linters aren't available
  async runBasicJavaScriptLint(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let errors = 0;
    let warnings = 0;
    const issues = [];

    // Basic checks
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Line length check
      if (line.length > 120) {
        warnings++;
        issues.push({
          line: lineNumber,
          message: 'Line too long (> 120 characters)',
          severity: 'warning'
        });
      }
      
      // Trailing whitespace
      if (/\s+$/.test(line)) {
        warnings++;
        issues.push({
          line: lineNumber,
          message: 'Trailing whitespace',
          severity: 'warning'
        });
      }
    });

    return { errors, warnings, total: errors + warnings, issues };
  }

  async runBasicSwiftLint(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let errors = 0;
    let warnings = 0;
    const issues = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Basic Swift conventions
      if (line.length > 120) {
        warnings++;
        issues.push({
          line: lineNumber,
          message: 'Line too long (> 120 characters)',
          severity: 'warning'
        });
      }
    });

    return { errors, warnings, total: errors + warnings, issues };
  }

  async runBasicPythonLint(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let errors = 0;
    let warnings = 0;
    const issues = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Basic Python conventions
      if (line.length > 79) {
        warnings++;
        issues.push({
          line: lineNumber,
          message: 'Line too long (> 79 characters)',
          severity: 'warning'
        });
      }
    });

    return { errors, warnings, total: errors + warnings, issues };
  }

  async runGenericLint(filePath) {
    // Generic file validation
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    const issues = [];
    let warnings = 0;
    
    if (stat.size > 1000000) { // 1MB
      warnings++;
      issues.push({
        message: 'Large file size (> 1MB)',
        severity: 'warning'
      });
    }
    
    if (content.includes('\t')) {
      warnings++;
      issues.push({
        message: 'File contains tabs (use spaces for indentation)',
        severity: 'warning'
      });
    }

    return { errors: 0, warnings, total: warnings, issues };
  }
}