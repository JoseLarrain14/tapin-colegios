// Jest setup file for mobile app tests

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000/api/v1',
      },
    },
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    Text: ({ children, ...props }) => React.createElement('Text', props, children),
    Surface: ({ children, ...props }) => React.createElement('Surface', props, children),
    ActivityIndicator: (props) => React.createElement('ActivityIndicator', props),
    Button: ({ children, ...props }) => React.createElement('Button', props, children),
    Card: ({ children, ...props }) => React.createElement('Card', props, children),
    IconButton: (props) => React.createElement('IconButton', props),
    Provider: ({ children }) => children,
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children, ...props }) => {
    const React = require('react');
    return React.createElement('Link', props, children);
  },
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
