export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed');
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      `${message || 'Expected values to be equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertMatchCount(actual, expected, label) {
  assertEqual(actual, expected, label);
}
