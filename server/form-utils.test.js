import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanString, cleanList, escapeHtml, readJsonBody, RequestError, checkRequestSize, requestContentType, isEmailAddress, createReference } from './form-utils.js';
import { renderEmailTemplate } from './email-template.js';

test('form cleaning preserves explicit limits and only accepts allow-listed list values', () => {
  assert.equal(cleanString('  A \n B \t C  '), 'A B C');
  assert.equal(cleanString('abcdef', 4), 'abcd');
  assert.equal(cleanString('a'.repeat(161)).length, 160);
  assert.equal(cleanString(null), '');
  assert.deepEqual(cleanList(['Events', 'Events', 'Unknown', 'Admin'], new Set(['Events', 'Admin'])), ['Events', 'Admin']);
  assert.deepEqual(cleanList('Events', new Set(['Events'])), []);
});

test('JSON bodies retain parsed-object support and reject malformed or empty raw input', () => {
  const payload = { name: 'Example' };
  assert.equal(readJsonBody(payload, 100), payload);
  assert.deepEqual(readJsonBody(JSON.stringify(payload), 100), payload);
  assert.deepEqual(readJsonBody(Buffer.from(JSON.stringify(payload)), 100), payload);
  for (const body of [undefined, '', '{not JSON}']) assert.equal(readJsonBody(body, 100), null);
});

test('raw JSON limits measure UTF-8 bytes and retain exact boundary values for both endpoints', () => {
  for (const limit of [24_000, 64_000]) {
    const body = JSON.stringify({ value: '\u9910'.repeat(100) });
    const padding = limit - Buffer.byteLength(body, 'utf8');
    const accepted = body + ' '.repeat(padding);
    assert.deepEqual(readJsonBody(accepted, limit), JSON.parse(body));
    assert.throws(() => readJsonBody(accepted + ' ', limit), { status: 413 });
    assert.throws(() => readJsonBody(Buffer.from(accepted + ' '), limit), { status: 413 });
  }
});

test('parsed JSON bodies cannot bypass the actual byte limit', () => {
  const body = { value: '\u9910'.repeat(100) };
  const size = Buffer.byteLength(JSON.stringify(body));
  assert.equal(readJsonBody(body, size), body);
  assert.throws(() => readJsonBody(body, size - 1), RequestError);
});

test('request metadata is checked strictly but media types are case-insensitive', () => {
  assert.equal(requestContentType({ headers: { 'content-type': 'Application/JSON; charset=utf-8' } }), 'application/json');
  assert.equal(requestContentType({ headers: {} }), '');
  assert.doesNotThrow(() => checkRequestSize({ headers: {} }, 100));
  assert.doesNotThrow(() => checkRequestSize({ headers: { 'content-length': '100' } }, 100));
  for (const value of ['-1', 'NaN', '1e2', '1.5', ['100']]) {
    assert.throws(() => checkRequestSize({ headers: { 'content-length': value } }, 100), { status: 400 });
  }
  assert.throws(() => checkRequestSize({ headers: { 'content-length': '101' } }, 100), { status: 413 });
});

test('mailboxes reject ambiguous address lists, controls and malformed local/domain parts', () => {
  for (const value of ['a@@example.com', 'a@example.com,b@example.com', 'A <a@example.com>',
    '.a@example.com', 'a..b@example.com', 'a@-example.com', 'a@localhost', 'a\r\n@example.com', 'a'.repeat(65) + '@example.com']) {
    assert.equal(isEmailAddress(value), false, value);
  }
  for (const value of ['a+b@example.co.uk', "o'connor@example.com", 'a@xn--bcher-kva.example']) {
    assert.equal(isEmailAddress(value), true, value);
  }
});

test('references remain unique even within the same millisecond', (t) => {
  t.mock.method(Date, 'now', () => 1800000000000);
  for (const kind of ['APP', 'TEMP', 'HIRE']) {
    const references = Array.from({ length: 100 }, () => createReference(kind));
    assert.equal(new Set(references).size, references.length);
    assert.match(references[0], new RegExp(`^CH-${kind}-\\d{8}-[A-F0-9]{12}$`));
  }
});

test('shared email presentation escapes every content surface and preserves experience paragraphs', () => {
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#039;');
  const html = renderEmailTemplate({
    eyebrow: 'Reference <test>',
    title: 'A & B',
    rows: [['<label>', '"value"']],
    detail: { label: 'Experience <text>', text: '<script>bad</script>\n\nNext paragraph' },
  });
  assert.match(html, /Reference &lt;test&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /&lt;label&gt;/);
  assert.match(html, /&quot;value&quot;/);
  assert.match(html, /Experience &lt;text&gt;/);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;<br><br>Next paragraph/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /background:#cccf5a/);
  assert.match(renderEmailTemplate({ eyebrow: 'Application', title: 'Role', rows: [], accent: 'mint' }), /background:#c9dfd2/);
});
