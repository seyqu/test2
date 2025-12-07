export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function safeDivide(num: number, denom: number): number {
  if (denom === 0) return 0;
  return num / denom;
}
