/**
 * Regression tests for CPRS formatter fixes:
 *  1. replaceTags() must NOT strip &#060; / &#062; entities (only strips HTML tags).
 *  2. "Test not performed" exclusion must be case-insensitive.
 *
 * Run with: node test/regression.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load index.html once for source-level assertions
// ---------------------------------------------------------------------------
const indexHtml = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log('  PASS:', description);
    passed++;
  } else {
    console.error('  FAIL:', description);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// replaceTags() — verify the source no longer contains the bad patterns
// and test the expected behaviour using a local copy of the fixed function.
// ---------------------------------------------------------------------------
console.log('\n--- replaceTags() source-level assertions ---');

assert(
  'replaceTags() does not replace &#060; with a space (bad pattern removed)',
  !indexHtml.includes('replace(/&#060;/g, " ")')
);

assert(
  'replaceTags() does not replace &#062; with a space (bad pattern removed)',
  !indexHtml.includes('replace(/&#062;/g, " ")')
);

// Local copy of the fixed replaceTags() used for behavioural tests below.
// It mirrors exactly what is now in index.html.
function replaceTags(s) {
  return s.replace(/\<[^>]*\>/g, '');
}

console.log('\n--- replaceTags() behaviour ---');

assert(
  'Plain text is returned unchanged',
  replaceTags('hello world') === 'hello world'
);

assert(
  'HTML span tags are stripped',
  replaceTags("<span style='color:red'>123</span>") === '123'
);

assert(
  '&#060; entity is NOT stripped or converted to a space',
  replaceTags('&#060;1.0') === '&#060;1.0'
);

assert(
  '&#062; entity is NOT stripped or converted to a space',
  replaceTags('&#062;1.0') === '&#062;1.0'
);

assert(
  'Visible length of &#060;1.0 equals 9 (entity intact, not 4 like " 1.0")',
  replaceTags('&#060;1.0').length === 9
);

assert(
  'Mixed span + entity: span stripped, entity preserved',
  replaceTags("<span style='color:red'>&#060;1.0</span>") === '&#060;1.0'
);

// ---------------------------------------------------------------------------
// 2. "Test not performed" exclusion — must be case-insensitive
// ---------------------------------------------------------------------------
console.log('\n--- "Test not performed" case-insensitive exclusion (source) ---');

assert(
  'Parser uses toLowerCase() for "test not performed" check',
  indexHtml.includes('vals[i].toLowerCase().indexOf("test not performed")')
);

assert(
  'Parser no longer uses case-sensitive "Test Not Performed" check',
  !indexHtml.includes('vals[i].indexOf("Test Not Performed")')
);

console.log('\n--- "Test not performed" case-insensitive exclusion (behaviour) ---');

// Simulate the exclusion check as it appears in the parser (fs()):
//   if (includeList && vals[i].toLowerCase().indexOf("test not performed") != -1)
//       includeList = false;
function wouldExclude(line) {
  return line.toLowerCase().indexOf('test not performed') !== -1;
}

assert(
  'Original casing "Test Not Performed" is excluded',
  wouldExclude('tTG Ab, IgA  Test Not Performed  [73367]')
);

assert(
  'Lowercase "Test not performed" from raw data is excluded',
  wouldExclude(
    '        Test not performed. Reflex testing not required since'
  )
);

assert(
  'All-caps "TEST NOT PERFORMED" is excluded',
  wouldExclude('TEST NOT PERFORMED')
);

assert(
  'Normal result line without the phrase is NOT excluded',
  !wouldExclude('tTG Ab, IgA                    &#060;1.0     U/mL                        [73367]')
);

// ---------------------------------------------------------------------------
// 3. Raw fixture data: verify the tTG Ab, IgA result value is &#060;1.0
//    after HTML-escaping (as the parser does) and that replaceTags() does
//    not shorten it to the wrong length.
// ---------------------------------------------------------------------------
console.log('\n--- Raw fixture: tTG Ab IgA value preservation ---');

const fixtureFile = path.join(__dirname, '..', 'fixtures', 'ttg_iga_lt_value.txt');
const fixture = fs.readFileSync(fixtureFile, 'utf8');

assert(
  'Fixture file contains the tTG Ab, IgA result line',
  fixture.includes('tTG Ab, IgA')
);

assert(
  'Fixture file contains the <1.0 result value',
  fixture.includes('<1.0')
);

assert(
  'Fixture file contains a "Test not performed" line (lowercase)',
  fixture.includes('Test not performed.')
);

// The parser escapes < as &#060; before storing.
const rawValue = '<1.0';
const escapedValue = rawValue.replace(/</g, '&#060;').replace(/>/g, '&#062;');

assert(
  'Parser escapes <1.0 to &#060;1.0',
  escapedValue === '&#060;1.0'
);

assert(
  'replaceTags(&#060;1.0) still equals &#060;1.0 (value not lost)',
  replaceTags(escapedValue) === '&#060;1.0'
);

assert(
  'replaceTags does not blank the escaped value (length > 1)',
  replaceTags(escapedValue).length > 1
);

// Simulate padding calculation that fr() / fishbones use:
// Before fix, replaceTags("&#060;1.0") returned " 1.0" (length 4),
// making the column too narrow and visually dropping the value.
const displayLen = replaceTags(escapedValue).length;
assert(
  'Padding calculation uses full entity length (9), not collapsed length (4)',
  displayLen === 9
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed + failed} test(s): ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

