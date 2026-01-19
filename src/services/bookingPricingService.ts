// src/services/bookingPricingService.ts

interface PricingCalculation {
  nights: number;
  pricePerNight: number;
  basePrice: number;
  taxAmount: number;
  discountAmount: number;
  totalPrice: number;
}

interface PricingParams {
  checkInDate: Date;
  checkOutDate: Date;
  pricePerNight: number;
  discountAmount?: number;
  taxRate?: number;
}

export class BookingPricingService {
  private static readonly DEFAULT_TAX_RATE = 0.12; // 12%

  /**
   * Calculate number of nights between two dates
   */
  static calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate complete booking pricing
   */
  static calculatePricing(params: PricingParams): PricingCalculation {
    const nights = this.calculateNights(params.checkInDate, params.checkOutDate);
    const pricePerNight = params.pricePerNight;
    const basePrice = pricePerNight * nights;
    const discountAmount = params.discountAmount || 0;
    const priceAfterDiscount = basePrice - discountAmount;
    const taxRate = params.taxRate || this.DEFAULT_TAX_RATE;
    const taxAmount = Math.round(priceAfterDiscount * taxRate);
    const totalPrice = priceAfterDiscount + taxAmount;

    return {
      nights,
      pricePerNight,
      basePrice,
      taxAmount,
      discountAmount,
      totalPrice
    };
  }

  /**
   * Format pricing for API response
   */
  static formatPricingResponse(calculation: PricingCalculation) {
    return {
      nights: calculation.nights,
      pricePerNight: calculation.pricePerNight,
      basePrice: calculation.basePrice,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      totalPrice: calculation.totalPrice
    };
  }
}