# Magents GUI Agent Creation E2E Tests

This directory contains comprehensive end-to-end tests for the GUI agent creation workflow, covering all features and edge cases as specified in Task 20.

## Test Coverage

### 🎯 Core Functionality (`agent-creation-wizard.spec.ts`)
- **Wizard Navigation**: Step-by-step navigation, validation, and state management
- **Project Selection**: Custom paths, existing projects, validation
- **Branch Management**: Branch naming, validation, agent ID generation
- **TaskMaster Integration**: Task selection, filtering, assignment
- **Advanced Configuration**: Docker, ports, environment variables
- **Preview & Create**: Configuration summary, warnings, resource estimation
- **Template Functionality**: Quick start templates and presets
- **Form Persistence**: State preservation across browser sessions

### 🚀 Performance Tests (`performance.spec.ts`)
- **UI Performance**: Page load times, navigation speed, input responsiveness
- **Large Dataset Handling**: Performance with many projects/tasks/files
- **Memory Management**: Memory leak detection and cleanup
- **Network Performance**: API call optimization and caching
- **Bundle Size**: Resource loading and optimization

### 🔧 CLI Integration (`cli-integration.spec.ts`)
- **Feature Parity**: GUI supports all CLI options
- **Configuration Equivalence**: GUI produces same results as CLI
- **Format Compatibility**: Compatible agent configurations
- **Validation Consistency**: Same validation rules as CLI
- **Error Handling**: Consistent error messages and behavior

### 🛡️ Error Handling (`error-handling.spec.ts`)
- **Network Errors**: API failures, timeouts, slow responses
- **Input Validation**: Edge cases, special characters, Unicode
- **Browser Compatibility**: Navigation, refresh, localStorage issues
- **State Management**: Rapid operations, concurrent updates
- **Resource Exhaustion**: Many variables, large inputs
- **Data Scenarios**: Empty responses, malformed data

## Test Structure

```
tests/e2e/
├── README.md                     # This file
├── playwright.config.ts          # Playwright configuration
├── global-setup.ts              # Test environment setup
├── global-teardown.ts           # Test cleanup
├── run-tests.ts                 # Custom test runner
├── pages/
│   └── CreateAgentPage.ts       # Page Object Model for wizard
├── utils/
│   └── test-helpers.ts          # Test utilities and helpers
├── fixtures/                    # Test data and projects
└── screenshots/                 # Failure screenshots
```

## Running Tests

### Prerequisites

1. **Services Running**: Both backend and frontend must be running
   ```bash
   npm run dev:backend  # Terminal 1
   npm run dev:web      # Terminal 2
   ```

2. **Dependencies**: Playwright browsers installed
   ```bash
   npx playwright install
   ```

### Test Commands

#### All Tests
```bash
npm run test:e2e                    # Run all E2E tests
npm run test:e2e:headed             # Run with visible browser
npm run test:e2e:debug              # Debug mode with browser
```

#### By Category
```bash
npm run test:e2e:core               # Core wizard functionality
npm run test:e2e:performance        # Performance and load tests
npm run test:e2e:integration        # CLI equivalence tests
npm run test:e2e:errors             # Error handling and edge cases
```

#### Specific Tests
```bash
npm run test:e2e:wizard             # Agent creation wizard tests
npm run test:playwright             # Direct Playwright execution
npm run test:playwright:ui          # Playwright UI mode
```

#### Advanced Options
```bash
# Run on specific browsers
npm run test:e2e -- --browsers chromium,firefox

# Run specific category with custom options
npm run test:e2e -- --category core --headed --workers 2

# Debug specific test
npm run test:e2e -- --suite wizard --debug
```

### Custom Test Runner

The custom test runner (`run-tests.ts`) provides:

- **Service Health Checks**: Ensures backend/frontend are running
- **Test Categorization**: Organized test execution by category
- **Progress Reporting**: Real-time test progress and results
- **Report Generation**: HTML and JSON test reports
- **Error Handling**: Graceful failure handling and reporting

#### Runner Options

```bash
--browsers <list>     # Comma-separated browsers (chromium,firefox,webkit)
--category <name>     # Test category (core,performance,integration,error-handling)
--suite <name>        # Specific test suite (partial name match)
--headed              # Visible browser mode
--debug               # Debug mode with verbose output
--workers <number>    # Number of parallel workers
--help                # Show help message
```

## Test Development

### Page Object Model

Tests use the Page Object Model pattern with `CreateAgentPage.ts`:

```typescript
// Example usage
const createAgentPage = new CreateAgentPage(page);
await createAgentPage.goto();
await createAgentPage.selectCustomPath('/test/project');
await createAgentPage.setBranch('feature/test');
await createAgentPage.createAgent();
```

### Test Helpers

Comprehensive utilities in `test-helpers.ts`:

```typescript
// Performance measurement
const loadTime = await TestHelpers.measurePageLoadTime(page, '/agents/new');

// Test data creation
const project = await TestHelpers.createTestProject('test-project');

// API mocking
await TestHelpers.mockApiResponse(page, 'api/projects', mockData);

// Retry operations
await TestHelpers.retryOperation(() => checkCondition(), 3, 1000);
```

### Writing New Tests

1. **Use Page Objects**: Always use the Page Object Model
2. **Test Isolation**: Each test should be independent
3. **Clean Setup/Teardown**: Use proper before/after hooks
4. **Meaningful Assertions**: Test behavior, not implementation
5. **Error Scenarios**: Include negative test cases
6. **Performance Considerations**: Monitor test execution time

Example test structure:

```typescript
test.describe('New Feature Tests', () => {
  let createAgentPage: CreateAgentPage;

  test.beforeEach(async ({ page }) => {
    createAgentPage = new CreateAgentPage(page);
    await createAgentPage.goto();
  });

  test('should handle new feature correctly', async () => {
    // Arrange
    await createAgentPage.selectCustomPath('/test/path');
    
    // Act
    await createAgentPage.enableNewFeature();
    
    // Assert
    expect(await createAgentPage.isNewFeatureEnabled()).toBe(true);
  });
});
```

## Test Data Management

### Fixtures

Test data is generated dynamically in `global-setup.ts`:

- **Test Projects**: Git repositories with package.json, README
- **TaskMaster Config**: Tasks and configuration for testing
- **Mock Data**: Projects, tasks, and API responses

### Cleanup

Automatic cleanup in `global-teardown.ts`:

- Removes test fixtures
- Cleans up test agents
- Resets test environment

## Debugging Tests

### Visual Debugging
```bash
npm run test:e2e:headed    # See browser during tests
npm run test:e2e:debug     # Step-by-step debugging
```

### Test Reports
- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results.json`
- **Screenshots**: Automatic on failure in `screenshots/`

### Common Issues

1. **Services Not Running**
   ```
   Error: Service check failed
   Solution: Start backend and frontend services
   ```

2. **Port Conflicts**
   ```
   Error: Port 3000/3001 in use
   Solution: Check for other running services
   ```

3. **Timeout Errors**
   ```
   Error: Test timeout
   Solution: Increase timeout or check service performance
   ```

## Performance Benchmarks

### Expected Performance Metrics

- **Wizard Load Time**: < 3 seconds
- **Step Navigation**: < 1 second per step
- **Form Validation**: < 1 second
- **API Responses**: < 2 seconds
- **Memory Usage**: < 100% increase during test session

### Performance Test Categories

1. **UI Responsiveness**: Input handling, navigation speed
2. **Large Dataset Handling**: Many projects/tasks/files
3. **Memory Management**: Leak detection, cleanup verification
4. **Network Optimization**: API call efficiency, caching
5. **Bundle Size**: Resource loading optimization

## Integration Test Scenarios

### CLI Equivalence Verification

Tests ensure GUI produces same results as CLI:

```bash
# GUI Configuration
Project: /test/project
Branch: feature/test
Agent ID: test-agent
Docker: enabled
Auto-accept: true

# Equivalent CLI Command
magents create \
  --project-path /test/project \
  --branch feature/test \
  --agent-id test-agent \
  --docker \
  --auto-accept
```

### Configuration Compatibility

- **Format Validation**: Same rules as CLI
- **Field Validation**: Consistent error messages
- **Output Format**: Compatible agent records
- **Feature Support**: All CLI options available

## Error Scenario Coverage

### Network Error Simulation

- **API Server Down**: 503 Service Unavailable
- **Slow Networks**: Delayed responses (3+ seconds)
- **Network Timeouts**: Request failures
- **Malformed Responses**: Invalid JSON, missing fields

### Input Edge Cases

- **Boundary Values**: Empty, very long inputs
- **Special Characters**: Unicode, emojis, symbols
- **Whitespace Handling**: Leading/trailing spaces
- **Copy-Paste Scenarios**: Formatted text, multiple lines

### Browser Compatibility

- **Navigation**: Back/forward, refresh, reload
- **Storage**: localStorage disabled, quota exceeded
- **Memory**: Large datasets, memory constraints
- **Concurrent Operations**: Rapid clicking, form updates

## Maintenance

### Regular Updates

1. **Update Test Data**: Keep fixtures current with features
2. **Review Timeouts**: Adjust based on performance changes
3. **Browser Updates**: Test with latest Playwright browsers
4. **API Changes**: Update mocks and expectations

### Best Practices

1. **Keep Tests Fast**: Optimize for quick feedback
2. **Stable Selectors**: Use data-testid, stable classes
3. **Clear Assertions**: Meaningful error messages
4. **Test Coverage**: Ensure all user paths are tested
5. **Documentation**: Keep this README updated

## Contributing

When adding new tests:

1. **Follow Patterns**: Use existing Page Objects and helpers
2. **Add Documentation**: Update this README
3. **Consider Categories**: Place in appropriate test file
4. **Test Locally**: Run full suite before submitting
5. **Performance Impact**: Consider test execution time

---

**Task 20 Completion**: This E2E test suite provides comprehensive coverage of the GUI agent creation workflow, including all required scenarios: project discovery, git validation, branch management, TaskMaster integration, configuration options, error handling, performance testing, and CLI equivalence verification.