import assert from 'node:assert/strict';
import test from 'node:test';
import { checkMergeGate } from '../src/review.js';

test('merge gate requires passing review, matching commit and passing checks', () => {
  const review = { verdict: 'pass' as const, commit: 'abc', findings: [], checks: [], reviewer: 'gpt-6.1-sol-high', createdAt: new Date().toISOString() };
  assert.equal(checkMergeGate(review, 'abc', [{ name: 'CI', status: 'success' }]).allowed, true);
  assert.equal(checkMergeGate(review, 'def', [{ name: 'CI', status: 'success' }]).allowed, false);
  assert.equal(checkMergeGate({ ...review, verdict: 'changes_requested' }, 'abc', [{ name: 'CI', status: 'success' }]).allowed, false);
  assert.equal(checkMergeGate(review, 'abc', [{ name: 'CI', status: 'failure' }]).allowed, false);
});
