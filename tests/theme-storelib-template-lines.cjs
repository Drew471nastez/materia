// Storelib reads a .storelib file's markup up to the first line that is only
// </template>. A nested <template> element closed on a line of its own ends
// the file there: the rest is dropped and the open <template> swallows every
// section after it on the page (the FAQ pro section hid Before and After
// Reveal, the footer and every section added below it in the builder).
// Only the file's own last </template> line may stand alone.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const bad = [];
for (const dir of ['sections', 'snippets', 'blocks', 'layout']) for (const f of fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith('.storelib'))) {
  const lines = fs.readFileSync(path.join(root, dir, f), 'utf8').split('\n');
  const first = lines.findIndex(l => /^\s*<\/template>\s*$/.test(l));
  const own = lines.lastIndexOf('</template>');
  if (first !== -1 && first !== own) bad.push(`${dir}/${f}:${first + 1}`);
}
assert.deepEqual(bad, [], 'a line that is only </template> before the file\'s own end: ' + bad.join(', '));
console.log('storelib template lines: every file ends its markup at its own last line');
