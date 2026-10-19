export class CalculationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationInputError";
  }
}

export function toScaledInt(
  value: number,
  decimals: number,
  label: string,
  allowNegative = false,
): number {
  if (!Number.isFinite(value)) {
    throw new CalculationInputError(`${label} must be a finite number.`);
  }
  if (!allowNegative && value < 0) {
    throw new CalculationInputError(`${label} cannot be negative.`);
  }
  if (allowNegative && Object.is(value, -0)) {
    return 0;
  }

  const negative = value < 0;
  const text = Math.abs(value).toFixed(decimals + 2);
  const [whole, fraction] = text.split(".") as [string, string];
  if (!/^0+$/.test(fraction.slice(decimals))) {
    throw new CalculationInputError(`${label} supports at most ${decimals} decimal places.`);
  }
  const scaled = Number(whole + fraction.slice(0, decimals));
  if (!Number.isSafeInteger(scaled)) {
    throw new CalculationInputError(`${label} is too large.`);
  }
  return negative ? -scaled : scaled;
}

export function formatScaled(value: number, decimals: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new CalculationInputError("Scaled value is not a safe integer.");
  }
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const factor = 10 ** decimals;
  const whole = Math.floor(absolute / factor);
  const fraction = String(absolute % factor).padStart(decimals, "0");
  return `${sign}${whole}.${fraction}`;
}

export function fromScaledInt(value: number, decimals: number): number {
  return Number(formatScaled(value, decimals));
}

/** Half away from zero. `numerator` and `denominator` are positive. */
export function mulDivHalfAway(amount: number, numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new CalculationInputError("Arithmetic inputs must be safe integers.");
  }
  if (denominator <= 0 || numerator < 0) {
    throw new CalculationInputError("Cannot divide by zero or a negative scale.");
  }
  const product = BigInt(amount) * BigInt(numerator);
  const divisor = BigInt(denominator);
  const negative = product < BigInt(0);
  const absolute = negative ? -product : product;
  const quotient = absolute / divisor;
  const remainder = absolute % divisor;
  const rounded = remainder * BigInt(2) >= divisor ? quotient + BigInt(1) : quotient;
  const signed = negative ? -rounded : rounded;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new CalculationInputError("Result is too large.");
  }
  return Number(signed);
}
