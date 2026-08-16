import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryMatches, nextBulkAction } from '../Jellyfin.Xtream/Configuration/Web/categoryToolbar.js';

test('categoryMatches: empty query matches everything', () => {
  assert.equal(categoryMatches('NL Sports', ''), true);
  assert.equal(categoryMatches('NL Sports', '   '), true);
});

test('categoryMatches: case-insensitive substring', () => {
  assert.equal(categoryMatches('NL | Sports', 'sports'), true);
  assert.equal(categoryMatches('NL | Sports', 'xxx'), false);
});

test('nextBulkAction: select when nothing or mixed is fully selected', () => {
  assert.equal(nextBulkAction([]), 'select');
  assert.equal(nextBulkAction([undefined, undefined]), 'select');
  assert.equal(nextBulkAction([undefined, []]), 'select');
  assert.equal(nextBulkAction([[1, 2], []]), 'select');
});

test('nextBulkAction: deselect only when every visible category is fully on', () => {
  assert.equal(nextBulkAction([[], []]), 'deselect');
});
