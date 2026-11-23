import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isKrathongMaterialEligible } from '../src/controllers/marketplace.controller.js';

describe('Krathong event material eligibility', () => {
  it('requires 10 approved PET scans', () => {
    assert.equal(isKrathongMaterialEligible('PET', 9), false);
    assert.equal(isKrathongMaterialEligible('PET', 10), true);
    assert.equal(isKrathongMaterialEligible('PET', 11), true);
  });

  it('requires 5 approved CAN scans', () => {
    assert.equal(isKrathongMaterialEligible('CAN', 4), false);
    assert.equal(isKrathongMaterialEligible('CAN', 5), true);
    assert.equal(isKrathongMaterialEligible('CAN', 6), true);
  });

  it('rejects unknown material types and invalid counts', () => {
    assert.equal(isKrathongMaterialEligible('GLASS', 10), false);
    assert.equal(isKrathongMaterialEligible('PET', Number.NaN), false);
    assert.equal(isKrathongMaterialEligible('CAN', undefined), false);
  });
});
