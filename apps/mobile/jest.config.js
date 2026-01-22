module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'js'],
  // Skip React Native components for now - only test pure logic
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.tsx$', // Skip TSX files that need React Native
  ],
};
