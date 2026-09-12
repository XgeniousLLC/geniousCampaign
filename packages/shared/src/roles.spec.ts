import { ROLES, isRole } from './roles';

describe('ROLES canonical', () => {
  it('contains exactly owner/editor/viewer in order', () => {
    expect(ROLES).toEqual(['owner', 'editor', 'viewer']);
  });

  it('is readonly tuple', () => {
    expect(ROLES.length).toBe(3);
  });
});

describe('isRole', () => {
  it('accepts each valid role', () => {
    for (const r of ROLES) expect(isRole(r)).toBe(true);
  });

  it('rejects invalid strings and non-strings', () => {
    expect(isRole('admin')).toBe(false);
    expect(isRole('Owner')).toBe(false);
    expect(isRole('')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(0)).toBe(false);
    expect(isRole({})).toBe(false);
  });
});
