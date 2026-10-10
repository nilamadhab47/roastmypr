const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mockRoast = require('../fixtures/mock-roast.json');

describe('mock roast fixture', () => {
  it('has the shape generateRoastFromClaude is expected to return', () => {
    assert.equal(typeof mockRoast.roast, 'string');
    assert.ok(mockRoast.roast.length > 0);
    assert.equal(typeof mockRoast.roastLevel, 'number');
    assert.equal(typeof mockRoast.archetype, 'string');
    assert.equal(typeof mockRoast.reason, 'string');
    assert.ok(Array.isArray(mockRoast.gif_queries));
    assert.ok(mockRoast.gif_queries.length >= 2);
    assert.ok(Array.isArray(mockRoast.alternativeRoasts));
    assert.equal(mockRoast.alternativeRoasts.length, 3);
  });
});
