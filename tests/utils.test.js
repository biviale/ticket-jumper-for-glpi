const { isSafeUrl } = require('../src/utils.js');

describe('isSafeUrl', () => {
  test.each([
    ['https://glpi.example.com', true],
    ['http://glpi.local', true],
    ['https://glpi.example.com:8080/front/ticket.form.php', true],
    ['http://localhost', true],
    ['javascript:alert(1)', false],
    ['JAVASCRIPT:void(0)', false],
    ['data:text/html,<h1>Hello</h1>', false],
    ['file:///etc/passwd', false],
    ['ftp://glpi.example.com', false],
    ['', false],
    [null, false],
    [undefined, false],
    ['not-a-url', false],
  ])('isSafeUrl(%s) → %s', (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });
});
