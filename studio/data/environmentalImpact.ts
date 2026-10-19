import type { ImpactNumber } from '../../src/lib/impactNumbers';

export const seedEnvironmentalImpact = {
  _id: 'environmental-impact',
  _type: 'environmentalImpact',
  metrics: [
    { _key: 'trees-funded', _type: 'impactNumber', number: '498', label: 'trees funded', shape: 'tree' },
    { _key: 'projects-worldwide', _type: 'impactNumber', number: '15', label: 'projects worldwide', shape: 'round' },
    { _key: 'carbon-avoidance', _type: 'impactNumber', number: '9', unit: 'tCO\u2082e', label: 'carbon avoidance', shape: 'soft' },
    { _key: 'habitat-restoration', _type: 'impactNumber', number: '34', unit: 'm\u00b2', label: 'habitat restoration', shape: 'soft' },
  ] satisfies Array<ImpactNumber & { _key: string; _type: 'impactNumber' }>,
};
