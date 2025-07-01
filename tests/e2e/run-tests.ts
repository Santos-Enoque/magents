#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  category: 'core' | 'performance' | 'integration' | 'error-handling';
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Agent Creation Wizard',
    file: 'agent-creation-wizard.spec.ts',
    description: 'Comprehensive tests for the 5-step agent creation wizard',
    category: 'core'
  },
  {
    name: 'Performance Tests',
    file: 'performance.spec.ts', 
    description: 'UI performance, large datasets, memory usage, and bundle size tests',
    category: 'performance'
  },
  {
    name: 'CLI Integration',
    file: 'cli-integration.spec.ts',
    description: 'Tests for GUI/CLI equivalence and feature parity',
    category: 'integration'
  },
  {
    name: 'Error Handling',
    file: 'error-handling.spec.ts',
    description: 'Network errors, input validation, browser compatibility, and edge cases',
    category: 'error-handling'
  }
];

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

class TestRunner {
  private results: TestResults[] = [];
  private startTime: number = Date.now();

  constructor(private options: {
    browsers?: string[];
    category?: string;
    suite?: string;
    headed?: boolean;
    debug?: boolean;
    workers?: number;
  } = {}) {}

  async run(): Promise<void> {
    console.log('🚀 Starting Magents GUI Agent Creation E2E Tests');
    console.log('================================================\n');

    this.printTestPlan();
    
    // Ensure services are running
    await this.checkServices();
    
    // Run test suites
    const suitesToRun = this.getSuitesToRun();
    
    for (const suite of suitesToRun) {
      await this.runTestSuite(suite);
    }
    
    this.printSummary();
  }

  private printTestPlan(): void {
    const suitesToRun = this.getSuitesToRun();
    
    console.log('📋 Test Plan:');
    suitesToRun.forEach((suite, index) => {
      console.log(`  ${index + 1}. ${suite.name} (${suite.category})`);
      console.log(`     ${suite.description}`);
    });
    console.log();
    
    if (this.options.browsers) {
      console.log(`🌐 Browsers: ${this.options.browsers.join(', ')}`);
    }
    if (this.options.workers) {
      console.log(`⚡ Workers: ${this.options.workers}`);
    }
    console.log();
  }

  private async checkServices(): Promise<void> {
    console.log('🔍 Checking required services...');
    
    try {
      // Check backend
      await this.checkService('Backend', 'http://localhost:3001/api/health');
      
      // Check frontend
      await this.checkService('Frontend', 'http://localhost:3000');
      
      console.log('✅ All services are running\n');
    } catch (error) {
      console.error('❌ Service check failed:', error);
      console.error('Please ensure both backend and frontend are running:');
      console.error('  npm run start:backend');
      console.error('  npm run start:web');
      process.exit(1);
    }
  }

  private async checkService(name: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${name} returned ${response.status}`);
      }
      console.log(`  ✅ ${name} is running`);
    } catch (error) {
      throw new Error(`${name} is not running at ${url}`);
    }
  }

  private getSuitesToRun(): TestSuite[] {
    let suites = TEST_SUITES;
    
    if (this.options.category) {
      suites = suites.filter(s => s.category === this.options.category);
    }
    
    if (this.options.suite) {
      suites = suites.filter(s => s.name.toLowerCase().includes(this.options.suite!.toLowerCase()));
    }
    
    return suites;
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`🧪 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    
    const startTime = Date.now();
    
    try {
      const args = this.buildPlaywrightArgs(suite);
      const command = `npx playwright test ${args.join(' ')}`;
      
      console.log(`   Command: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
        stdio: this.options.debug ? 'inherit' : 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const results = this.parseTestOutput(output, suite.name, duration);
      this.results.push(results);
      
      console.log(`   ✅ Completed in ${duration}ms`);
      console.log(`   📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped\n`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const results: TestResults = {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error.message]
      };
      
      this.results.push(results);
      
      console.log(`   ❌ Failed in ${duration}ms`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  private buildPlaywrightArgs(suite: TestSuite): string[] {
    const args = [suite.file];
    
    if (this.options.browsers) {
      args.push(`--project=${this.options.browsers.join(',')}`);
    }
    
    if (this.options.headed) {
      args.push('--headed');
    }
    
    if (this.options.debug) {
      args.push('--debug');
    }
    
    if (this.options.workers) {
      args.push(`--workers=${this.options.workers}`);
    }
    
    // Always generate reports
    args.push('--reporter=html,json,list');
    
    return args;
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestResults {
    // Basic parsing - Playwright output format
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    
    return {
      suite: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration,
      errors: []
    };
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;
    
    console.log('📊 Test Results Summary');
    console.log('========================\n');
    
    this.results.forEach(result => {
      const status = result.failed > 0 ? '❌' : '✅';
      console.log(`${status} ${result.suite}`);
      console.log(`   Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
      console.log(`   Duration: ${result.duration}ms`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      console.log();
    });
    
    console.log('Overall Summary:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    
    // Generate report links
    console.log('\n📄 Reports:');
    console.log('  HTML Report: playwright-report/index.html');
    console.log('  JSON Results: test-results.json');
    
    // Exit with error code if any tests failed
    if (totalFailed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const options: any = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--browsers':
        options.browsers = args[++i]?.split(',');
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--suite':
        options.suite = args[++i];
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--workers':
        options.workers = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  const runner = new TestRunner(options);
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

function printHelp() {
  console.log(`
Magents E2E Test Runner

Usage: npm run test:e2e [options]

Options:
  --browsers <list>     Comma-separated list of browsers (chromium,firefox,webkit)
  --category <name>     Run tests from specific category (core,performance,integration,error-handling)
  --suite <name>        Run specific test suite (partial name match)
  --headed              Run tests in headed mode (visible browser)
  --debug               Run tests in debug mode with verbose output
  --workers <number>    Number of parallel workers
  --help                Show this help message

Examples:
  npm run test:e2e                                    # Run all tests
  npm run test:e2e -- --category core                 # Run only core tests
  npm run test:e2e -- --suite wizard                  # Run wizard tests
  npm run test:e2e -- --browsers chromium,firefox     # Run on specific browsers
  npm run test:e2e -- --headed --debug               # Debug mode with visible browser
  
Categories:
  core            - Agent creation wizard functionality
  performance     - Performance, memory, and load tests
  integration     - CLI equivalence and compatibility tests
  error-handling  - Error scenarios and edge cases
`);
}

if (require.main === module) {
  main();
}

export { TestRunner, TEST_SUITES };