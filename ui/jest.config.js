// eslint-disable-next-line no-undef
module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageReporters: ['lcov', 'text-summary'],
    coverageDirectory: '<rootDir>',
    transformIgnorePatterns: ['/node_modules/(?!(react-markdown))/']
}
