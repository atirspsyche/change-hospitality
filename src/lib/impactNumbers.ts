export interface ImpactNumber {
  number: string;
  label: string;
  unit?: string | null;
  shape: 'tree' | 'round' | 'soft';
}

function isImpactNumber(value: unknown): value is ImpactNumber {
  return typeof value === 'object' && value !== null
    && 'number' in value && typeof value.number === 'string' && value.number.trim().length > 0
    && 'label' in value && typeof value.label === 'string' && value.label.trim().length > 0
    && (!('unit' in value) || value.unit == null || typeof value.unit === 'string')
    && 'shape' in value && (value.shape === 'tree' || value.shape === 'round' || value.shape === 'soft');
}

export function requireImpactNumbers(value: unknown): ImpactNumber[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      'Environmental impact numbers are missing in Sanity. Run npm run seed:impact in studio, '
      + 'or publish the Environmental impact document before rebuilding the website.',
    );
  }
  if (!value.every(isImpactNumber)) {
    throw new Error(
      'Invalid Sanity environmental impact numbers: every entry needs a non-blank number and label, '
      + 'an optional text unit, and a tree, round or soft shape. Correct and publish the document before rebuilding.',
    );
  }
  return value;
}
