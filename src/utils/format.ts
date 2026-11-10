/**
 * Utility for formatting Indian Rupee currency values with consistent paise handling.
 */
export interface FormatINROptions {
  showSymbol?: boolean;
  showSign?: boolean;
  alwaysShowPaise?: boolean;
}

export function formatINRParts(amount: number): {
  isNegative: boolean;
  whole: string;
  paise: string | null;
  formatted: string;
} {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const wholeNum = Math.trunc(abs);
  const paiseNum = Math.round((abs - wholeNum) * 100);

  const wholeStr = wholeNum.toLocaleString('en-IN');
  const paiseStr = paiseNum > 0 ? String(paiseNum).padStart(2, '0') : null;

  return {
    isNegative,
    whole: wholeStr,
    paise: paiseStr,
    formatted: paiseStr ? `${wholeStr}.${paiseStr}` : wholeStr,
  };
}

export function formatINR(amount: number, options: FormatINROptions = {}): string {
  const { showSymbol = true, showSign = false, alwaysShowPaise = false } = options;
  const { isNegative, whole, paise } = formatINRParts(amount);

  let paisePart = '';
  if (paise) {
    paisePart = `.${paise}`;
  } else if (alwaysShowPaise) {
    paisePart = '.00';
  }

  const sign = isNegative ? '-' : showSign ? '+' : '';
  const symbol = showSymbol ? '₹' : '';

  return `${sign}${symbol}${whole}${paisePart}`;
}
