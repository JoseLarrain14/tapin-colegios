# Mobile App Tests

This directory contains unit and integration tests for the mobile application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- cafeteria.test.tsx
```

## Test Structure

### cafeteria.test.tsx

Tests for the Cafeteria tab component, focusing on:

1. **Week Offset Menu Reload**
   - Verifies that changing `weekOffset` triggers a reload of the menu
   - Tests date calculations for different week offsets
   - Ensures correct date string formatting (YYYY-MM-DD)

2. **Empty/Malformed API Response Handling**
   - Tests handling of empty items arrays
   - Tests handling of null/undefined items
   - Tests handling of missing data fields
   - Tests handling of API failures
   - Tests handling of items with missing fields
   - Tests handling of network errors
   - Tests nested response formats (both array and `{ students: array }`)
   - Tests missing cafeteria in student data
   - Tests fallback logic from `getMenuByDate` to `getMenuByDay`

## Test Dependencies

The tests use:
- **Jest**: Test runner
- **jest-expo**: Expo preset for Jest
- **@testing-library/react**: For testing React components
- **@testing-library/react-hooks**: For testing custom hooks

## Mocking Strategy

The tests mock:
- `apiService` - All API calls are mocked to test logic without network calls
- `authStore` - Zustand store for authentication
- React Native components - Simplified for testing
- Expo modules - Constants and other Expo-specific modules

## Key Test Cases

### 1. Week Offset Triggers Reload

When the user changes the week offset (prev/next week buttons), the component should:
- Calculate the new date range
- Call `getMenuByDate` with the correct date string
- Update the menu items based on the new week

### 2. Safe API Response Handling

The component safely handles:
- Empty arrays: `{ items: [] }`
- Null values: `{ items: null }`
- Missing data: `{ success: true }` (no data field)
- API errors: Network failures, timeouts
- Malformed items: Missing optional fields
- Nested formats: Different response structures

## Adding New Tests

When adding new tests:

1. Create a new test file in `__tests__/`
2. Follow the naming convention: `*.test.tsx` or `*.test.ts`
3. Mock external dependencies
4. Focus on testing logic, not UI rendering
5. Use descriptive test names

Example:

```typescript
describe('ComponentName', () => {
  describe('feature description', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Coverage Goals

- Aim for >80% code coverage
- Focus on critical business logic
- Test edge cases and error handling
- Test user interactions and state changes

## Troubleshooting

### Module Not Found Errors

If you see module not found errors, ensure all dependencies are installed:

```bash
npm install
```

### Mock Issues

If mocks aren't working, check:
- Mock paths match actual file structure
- Mocks are defined before importing components
- jest.setup.js is properly configured

### Async Test Failures

For async tests, use:
- `await waitFor()` for async state updates
- `act()` for state changes
- Proper async/await syntax
