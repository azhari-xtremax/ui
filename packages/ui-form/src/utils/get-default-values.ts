/**
 * Get default values from field definitions
 * Uses @buildpad/utils getFieldDefault for proper handling of
 * database-generated defaults (now(), gen_random_uuid, etc.)
 */

import type { Field } from '@buildpad/types';
import { getDefaultValuesFromFields as buildDefaults } from '@buildpad/utils';
import type { FieldValues } from '../types';

/**
 * Extract default values from field schema
 * Filters out database-generated defaults that shouldn't be used as form values
 *
 * The implementation lives in `@buildpad/utils` beside the parser it calls, so
 * the value this form renders and the value a caller submits come from one
 * rule rather than two copies that can drift.
 */
export function getDefaultValuesFromFields(fields: Field[]): FieldValues {
  return buildDefaults(fields);
}
