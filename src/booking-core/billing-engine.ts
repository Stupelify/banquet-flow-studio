/**
 * Unified billing entry point — form adapters + persistence + discount sync.
 * Form totals delegate to sumBookingLines via formPacksToSumBookingInput (single engine).
 */
export {
  PACK_KEYS,
  type MealPackKey,
  type PackBillingRow,
  computePackCateringAmount,
  computePackHallAmount,
  computePackRowAmount,
  computeMealsSubtotal,
  computeExtrasSubtotal,
  computePreDiscountTotal,
  buildBookingHallRows,
  sumPackHallRates,
  computePackRowAmountFromApiPack,
  formPackRowToPackLine,
  formPacksToSumBookingInput,
} from './billing-lines';

export {
  type HallLine,
  type PackLine,
  type AdditionalLine,
  mapPackLineForSumBooking,
  sumBookingLines,
  splitMealsAndExtrasSubtotals,
  resolveBookingFinancials,
  assertFinancialsWithinCeiling,
  computeMealsDiscountCarryForward,
} from './booking-lines';

export {
  computePayableGrandTotal,
  syncBillingAmounts,
  validateBillingCeiling,
  formatDiscountPercentDisplay,
  type BillingAmountSyncMode,
} from './financials';

export { roundRupee, formatRupeeAmount, exceedsBillingCeiling } from './money';
