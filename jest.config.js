module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['./tests/setup.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/background-entry.js',   // non testable dans Node.js (importScripts)
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ]
};
