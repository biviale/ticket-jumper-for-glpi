Object.assign(global, require('jest-chrome'));

// Use the real isSafeUrl from utils.js instead of a mock
global.isSafeUrl = require('../src/utils.js').isSafeUrl;
