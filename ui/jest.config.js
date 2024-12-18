// eslint-disable-next-line no-undef
export default {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageReporters: ['lcov', 'text-summary'],
    coverageDirectory: '<rootDir>',
    transformIgnorePatterns: ['/node_modules/(?!(react-markdown))/'],
    testTimeout: 10000,
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
}
