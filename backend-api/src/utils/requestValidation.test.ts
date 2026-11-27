import assert from 'node:assert/strict';
import test from 'node:test';
import {
    isRecord,
    isNonEmptyString,
    isOptionalNullableString,
    isAssignedTherapist,
    isPositiveInteger,
    parsePathId
} from './requestValidation';

test('JSON bodies must be objects rather than arrays or primitives', () => {
    assert.equal(isRecord({ nombre: 'Ana' }), true);
    assert.equal(isRecord([]), false);
    assert.equal(isRecord('texto'), false);
    assert.equal(isRecord(null), false);
});

test('text validators reject numbers and accept valid strings', () => {
    assert.equal(isNonEmptyString('Ana', 30), true);
    assert.equal(isNonEmptyString('   ', 30), false);
    assert.equal(isNonEmptyString(42, 30), false);
    assert.equal(isOptionalNullableString(null, 50), true);
    assert.equal(isOptionalNullableString(42, 50), false);
});

test('integer validation does not coerce strings or fractions', () => {
    assert.equal(isPositiveInteger(42), true);
    assert.equal(isPositiveInteger('42'), false);
    assert.equal(isPositiveInteger(4.2), false);
    assert.equal(isPositiveInteger(Number.MAX_SAFE_INTEGER + 1), false);
});

test('appointment scheduling requires the selected slot therapist to match the assigned therapist', () => {
    assert.equal(isAssignedTherapist(7, 7), true);
    assert.equal(isAssignedTherapist(7, 8), false);
    assert.equal(isAssignedTherapist(0, 7), false);
});

test('path IDs accept only positive decimal safe integers', () => {
    assert.equal(parsePathId('42'), 42);
    assert.equal(parsePathId('0'), null);
    assert.equal(parsePathId('4.2'), null);
    assert.equal(parsePathId('42abc'), null);
    assert.equal(parsePathId('9007199254740992'), null);
});
