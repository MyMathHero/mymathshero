export const STRIPE_CONFIG = {
  prices: {
    standardMonthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    standardAnnual: process.env.STRIPE_PRICE_STANDARD_ANNUAL,
    premiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    premiumAnnual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    foundingMonthly: process.env.STRIPE_PRICE_FOUNDING_MONTHLY,
    siblingMonthly: process.env.STRIPE_PRICE_SIBLING_MONTHLY,
  },
  products: {
    standard: process.env.STRIPE_PRODUCT_STANDARD,
    premium: process.env.STRIPE_PRODUCT_PREMIUM,
    sibling: process.env.STRIPE_PRODUCT_SIBLING,
  },
  coupons: {
    freeMonth: 'FREE1MONTH',
  },
  // Founding family offer:
  // Month 1: free trial (30 days)
  // Month 2-12: $19.99/mo (foundingMonthly)
  // Month 13+: $24.99/mo (premiumMonthly) — via schedule
  founding: {
    trialDays: 30,
    firstYearCycles: 12,
  },
}

export function getPlanFromPriceId(priceId) {
  const { prices } = STRIPE_CONFIG
  if ([
    prices.premiumMonthly,
    prices.premiumAnnual,
    prices.foundingMonthly,
  ].includes(priceId)) return 'premium'
  if ([
    prices.standardMonthly,
    prices.standardAnnual,
  ].includes(priceId)) return 'standard'
  return 'free'
}
