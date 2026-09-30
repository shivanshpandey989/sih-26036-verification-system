/**
 * Configurable pass/fail rule engine for verification observations.
 *
 * IMPORTANT: The numeric limits below are PLACEHOLDER values for demo
 * purposes only. They are structured so that real Legal Metrology
 * (Weights & Measures) tolerance tables can be dropped in per
 * instrument type / accuracy class without changing any application
 * code — replace the `parameterRules` map with the applicable rules.
 *
 * Each rule can define either:
 *   - { min, max }        -> numeric observation must fall within [min, max]
 *   - { tolerance }       -> |observation - expected| <= tolerance
 *   - a custom evaluator function (value, expected) => 'PASS' | 'FAIL'
 */

const parameterRules = {
  'Zero Error': { tolerance: 0.05 },
  'Accuracy': { tolerance: 0.1 },
  'Repeatability': { tolerance: 0.05 },
  'Sensitivity': { tolerance: 0.02 },
  'Error Test': { tolerance: 0.1 },
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[^\d.+-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

/**
 * Evaluate a single observation against configured rules (or explicit
 * min/max stored on the observation row itself, which takes priority).
 */
function evaluateObservation({ parameter, observationValue, expectedValue, minValue, maxValue }) {
  const value = toNumber(observationValue);
  if (value === null) return 'PENDING';

  // Explicit min/max on the row wins if present.
  if (minValue !== null && minValue !== undefined && maxValue !== null && maxValue !== undefined) {
    return value >= minValue && value <= maxValue ? 'PASS' : 'FAIL';
  }

  const rule = parameterRules[parameter];
  if (!rule) return 'PENDING';

  if (typeof rule.evaluate === 'function') {
    return rule.evaluate(value, toNumber(expectedValue));
  }

  if (rule.min !== undefined && rule.max !== undefined) {
    return value >= rule.min && value <= rule.max ? 'PASS' : 'FAIL';
  }

  if (rule.tolerance !== undefined) {
    const expected = toNumber(expectedValue) ?? 0;
    return Math.abs(value - expected) <= rule.tolerance ? 'PASS' : 'FAIL';
  }

  return 'PENDING';
}

/**
 * Roll up a list of observation statuses into an overall verification
 * result. Any FAIL -> overall FAIL. All PASS (and at least one
 * observation) -> overall PASS. Otherwise PENDING (still in progress).
 */
function computeOverallResult(observations) {
  if (!observations.length) return 'PENDING';
  if (observations.some((o) => o.status === 'FAIL')) return 'FAIL';
  if (observations.every((o) => o.status === 'PASS')) return 'PASS';
  return 'PENDING';
}

const DEFAULT_PARAMETERS = [
  { parameter: 'Zero Error', unit: 'g', expectedValue: '0' },
  { parameter: 'Accuracy', unit: 'g', expectedValue: '0' },
  { parameter: 'Repeatability', unit: 'g', expectedValue: '0' },
  { parameter: 'Sensitivity', unit: 'g', expectedValue: '0' },
  { parameter: 'Error Test', unit: 'g', expectedValue: '0' },
];

module.exports = { evaluateObservation, computeOverallResult, parameterRules, DEFAULT_PARAMETERS };
