module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/../src/common/$1',
    '^@config/(.*)$': '<rootDir>/../src/config/$1',
    '^@modules/(.*)$': '<rootDir>/../src/modules/$1',
    '^@integrations/(.*)$': '<rootDir>/../src/integrations/$1',
  },
};