import { describe, expect, test } from 'vitest';
import { genieSpaceId } from './features';

describe('genieSpaceId', () => {
  test('is the space ID only when the flag is on and a space is bound', () => {
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: 'true', DATABRICKS_GENIE_SPACE_ID: 'abc' })).toBe('abc');
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: ' TRUE ', DATABRICKS_GENIE_SPACE_ID: ' abc ' })).toBe('abc');
  });

  test('is off by default, when the flag is anything but true, or with no space', () => {
    expect(genieSpaceId({})).toBeNull();
    expect(genieSpaceId({ DATABRICKS_GENIE_SPACE_ID: 'abc' })).toBeNull();
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: 'false', DATABRICKS_GENIE_SPACE_ID: 'abc' })).toBeNull();
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: '1', DATABRICKS_GENIE_SPACE_ID: 'abc' })).toBeNull();
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: 'true' })).toBeNull();
    expect(genieSpaceId({ HAWKERREACH_GENIE_ENABLED: 'true', DATABRICKS_GENIE_SPACE_ID: '  ' })).toBeNull();
  });
});
