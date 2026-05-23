/**
 * Price calculation utilities for GST-inclusive pricing (frontend)
 * All prices are stored and communicated as total_price (GST-inclusive)
 * Base and GST amounts are calculated on-the-fly when needed
 *
 * GST Rate: 5% (built into menu prices)
 * Formula:
 *   - total_price = base_price * 1.05
 *   - base_price = total_price / 1.05
 *   - gst_amount = total_price - base_price
 */

const GST_RATE = 0.05;
const GST_MULTIPLIER = 1 + GST_RATE; // 1.05

/**
 * Calculate base price from total price
 * @param totalPrice - Total price (GST-inclusive)
 * @returns Base price without GST
 */
export function calculateBasePrice(totalPrice: number): number {
  return roundCurrency(totalPrice / GST_MULTIPLIER);
}

/**
 * Calculate GST amount from total price
 * @param totalPrice - Total price (GST-inclusive)
 * @returns GST amount
 */
export function calculateGSTAmount(totalPrice: number): number {
  const basePrice = calculateBasePrice(totalPrice);
  return roundCurrency(totalPrice - basePrice);
}

/**
 * Get complete price breakdown from total price
 * @param totalPrice - Total price (GST-inclusive)
 * @returns Object with base_price, gst_amount, total_price
 */
export function getPriceBreakdown(totalPrice: number) {
  const basePrice = calculateBasePrice(totalPrice);
  const gstAmount = calculateGSTAmount(totalPrice);

  return {
    base_price: basePrice,
    gst_amount: gstAmount,
    total_price: roundCurrency(totalPrice)
  };
}

/**
 * Round currency to 2 decimal places
 * Prevents floating-point precision errors
 * @param amount - Amount to round
 * @returns Rounded amount
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount || 0) * 100) / 100;
}

/**
 * Apply cents-based rounding for calculations
 * Ensures precision across all operations
 * @param amount - Amount to round
 * @returns Rounded amount
 */
export function roundToCents(amount: number): number {
  return Math.round((amount || 0) * 100) / 100;
}

/**
 * Safely add multiple total prices (handles floating-point errors)
 * @param totalPrices - Array of total prices to sum
 * @returns Sum rounded to 2 decimals
 */
export function sumTotalPrices(totalPrices: number[]): number {
  const totalCents = totalPrices.reduce((sum, price) => {
    return sum + Math.round((price || 0) * 100);
  }, 0);
  return totalCents / 100;
}

/**
 * Safely calculate average of multiple total prices
 * @param totalPrices - Array of total prices
 * @returns Average rounded to 2 decimals
 */
export function averageTotalPrices(totalPrices: number[]): number {
  if (!totalPrices.length) return 0;
  const sum = sumTotalPrices(totalPrices);
  return roundCurrency(sum / totalPrices.length);
}
