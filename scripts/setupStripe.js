require('dotenv').config({ path: '.env.local' })
const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in .env.local')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Helper: create a coupon, tolerating "already exists".
async function ensureCoupon(params) {
  try {
    return await stripe.coupons.create(params)
  } catch (err) {
    if (err.code === 'resource_already_exists') {
      console.log(`ℹ️  Coupon ${params.id} already exists — reusing`)
      return await stripe.coupons.retrieve(params.id)
    }
    throw err
  }
}

// Helper: create a promotion code, tolerating "already exists" (matched by code).
async function ensurePromoCode(params) {
  try {
    return await stripe.promotionCodes.create(params)
  } catch (err) {
    if (err.code === 'resource_already_exists' || /already.*active.*code/i.test(err.message)) {
      const existing = await stripe.promotionCodes.list({ code: params.code, limit: 1 })
      if (existing.data[0]) {
        console.log(`ℹ️  Promo code ${params.code} already exists — reusing`)
        return existing.data[0]
      }
    }
    throw err
  }
}

async function setupStripe() {
  console.log('🚀 Setting up Stripe products for MyMathsHero...\n')

  // ==================
  // PRODUCTS
  // ==================

  console.log('Creating products...')

  const standardProduct = await stripe.products.create({
    name: 'MyMathsHero Standard',
    description: 'All Maths curriculum, Hero Points, badges, leaderboard and weekly reports.',
    metadata: { plan: 'standard' },
  })
  console.log('✅ Standard product:', standardProduct.id)

  const premiumProduct = await stripe.products.create({
    name: 'MyMathsHero Premium',
    description: 'Everything in Standard plus Ask Hero AI Tutor, full Arcade access and voice explanations.',
    metadata: { plan: 'premium' },
  })
  console.log('✅ Premium product:', premiumProduct.id)

  const siblingProduct = await stripe.products.create({
    name: 'MyMathsHero Sibling Add-on',
    description: 'Add another child to your existing subscription.',
    metadata: { plan: 'sibling' },
  })
  console.log('✅ Sibling product:', siblingProduct.id)

  // ==================
  // PRICES
  // ==================

  console.log('\nCreating prices...')

  // Standard Monthly $14.99 AUD
  const standardMonthly = await stripe.prices.create({
    product: standardProduct.id,
    unit_amount: 1499,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'Standard Monthly',
    metadata: { plan: 'standard', billing: 'monthly' },
  })
  console.log('✅ Standard Monthly ($14.99/mo):', standardMonthly.id)

  // Standard Annual $149.90 AUD
  const standardAnnual = await stripe.prices.create({
    product: standardProduct.id,
    unit_amount: 14990,
    currency: 'aud',
    recurring: { interval: 'year' },
    nickname: 'Standard Annual',
    metadata: { plan: 'standard', billing: 'annual' },
  })
  console.log('✅ Standard Annual ($149.90/yr):', standardAnnual.id)

  // Premium Monthly $24.99 AUD — the FULL price
  // Founding families start at $19.99/mo then move to THIS price
  const premiumMonthly = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 2499,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'Premium Monthly',
    metadata: { plan: 'premium', billing: 'monthly' },
  })
  console.log('✅ Premium Monthly ($24.99/mo):', premiumMonthly.id)

  // Premium Annual $249.90 AUD
  const premiumAnnual = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 24990,
    currency: 'aud',
    recurring: { interval: 'year' },
    nickname: 'Premium Annual',
    metadata: { plan: 'premium', billing: 'annual' },
  })
  console.log('✅ Premium Annual ($249.90/yr):', premiumAnnual.id)

  // Founding Family Price $19.99 AUD/month
  // IMPORTANT: This is $19.99 PER MONTH for the first year (12 months)
  // after a 30-day free trial.
  // After 12 billing cycles Stripe Subscription Schedule
  // moves them to the $24.99/month Premium price automatically.
  const foundingMonthly = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 1999,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'Founding Family Monthly ($19.99/mo first year)',
    metadata: {
      plan: 'premium',
      billing: 'monthly',
      promo: 'founding',
      note: 'First year only. Moves to $24.99/mo after 12 cycles.',
    },
  })
  console.log('✅ Founding Monthly ($19.99/mo):', foundingMonthly.id)

  // Sibling Add-on $10 AUD/month
  const siblingMonthly = await stripe.prices.create({
    product: siblingProduct.id,
    unit_amount: 1000,
    currency: 'aud',
    recurring: { interval: 'month' },
    nickname: 'Sibling Monthly',
    metadata: { plan: 'sibling', billing: 'monthly' },
  })
  console.log('✅ Sibling Monthly ($10/mo):', siblingMonthly.id)

  // ==================
  // COUPONS
  // ==================

  console.log('\nCreating coupons...')

  // FREE1MONTH — admin activates when needed
  // Gives one free month trial to any new signup
  const freeMonthCoupon = await ensureCoupon({
    id: 'FREE1MONTH',
    name: 'First Month Free',
    duration: 'once',
    percent_off: 100,
    metadata: { type: 'promo', admin_controlled: 'true' },
  })
  console.log('✅ Free month coupon (FREE1MONTH):', freeMonthCoupon.id)

  // ==================
  // PROMOTION CODES
  // ==================

  console.log('\nCreating promotion codes...')

  // FREE1MONTH promo code — starts inactive, admin turns on
  const freeMonthPromo = await ensurePromoCode({
    promotion: { type: 'coupon', coupon: 'FREE1MONTH' },
    code: 'FREE1MONTH',
    active: false, // OFF by default — admin activates in console
    metadata: { type: 'promo', admin_controlled: 'true' },
  })
  console.log('✅ Free month promo code (OFF by default):', freeMonthPromo.id)

  // ==================
  // CUSTOMER PORTAL CONFIG
  // ==================

  console.log('\nConfiguring customer portal...')

  await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'MyMathsHero — Manage your subscription',
      privacy_policy_url: 'https://mymathshero.com.au/privacy',
      terms_of_service_url: 'https://mymathshero.com.au/terms',
    },
    default_return_url: 'https://mymathshero.com.au/parent-dashboard',
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      subscription_pause: { enabled: false },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'always_invoice',
        products: [
          {
            product: standardProduct.id,
            prices: [standardMonthly.id, standardAnnual.id],
          },
          {
            // Founding price intentionally omitted: the portal requires unique
            // billing intervals per product, and it's a promo price users
            // shouldn't be able to switch TO via the portal.
            product: premiumProduct.id,
            prices: [
              premiumMonthly.id,
              premiumAnnual.id,
            ],
          },
        ],
      },
    },
  })
  console.log('✅ Customer portal configured')

  // ==================
  // SAVE IDS
  // ==================

  const config = {
    products: {
      standard: standardProduct.id,
      premium: premiumProduct.id,
      sibling: siblingProduct.id,
    },
    prices: {
      standardMonthly: standardMonthly.id,
      standardAnnual: standardAnnual.id,
      premiumMonthly: premiumMonthly.id,
      premiumAnnual: premiumAnnual.id,
      foundingMonthly: foundingMonthly.id,
      siblingMonthly: siblingMonthly.id,
    },
    coupons: {
      freeMonth: 'FREE1MONTH',
    },
    promoCodes: {
      freeMonth: freeMonthPromo.id,
    },
  }

  console.log('\n✅ STRIPE SETUP COMPLETE!\n')
  console.log('═══════════════════════════════════════')
  console.log('Copy these into your .env.local:\n')
  console.log(`STRIPE_PRODUCT_STANDARD=${standardProduct.id}`)
  console.log(`STRIPE_PRODUCT_PREMIUM=${premiumProduct.id}`)
  console.log(`STRIPE_PRODUCT_SIBLING=${siblingProduct.id}`)
  console.log(`STRIPE_PRICE_STANDARD_MONTHLY=${standardMonthly.id}`)
  console.log(`STRIPE_PRICE_STANDARD_ANNUAL=${standardAnnual.id}`)
  console.log(`STRIPE_PRICE_PREMIUM_MONTHLY=${premiumMonthly.id}`)
  console.log(`STRIPE_PRICE_PREMIUM_ANNUAL=${premiumAnnual.id}`)
  console.log(`STRIPE_PRICE_FOUNDING_MONTHLY=${foundingMonthly.id}`)
  console.log(`STRIPE_PRICE_SIBLING_MONTHLY=${siblingMonthly.id}`)
  console.log('\nPromo codes:')
  console.log('FREE1MONTH — currently OFF (activate in admin)')
  console.log('\nFounding family flow:')
  console.log('Month 1: FREE trial')
  console.log('Month 2-12: $19.99/mo (foundingMonthly price)')
  console.log('Month 13+: $24.99/mo (premiumMonthly price)')
  console.log('Handled via Stripe Subscription Schedule')
  console.log('═══════════════════════════════════════')

  const fs = require('fs')
  fs.writeFileSync(
    'scripts/stripe-ids.json',
    JSON.stringify(config, null, 2)
  )
  console.log('\n📄 All IDs saved to scripts/stripe-ids.json')

  return config
}

setupStripe().catch(err => {
  console.error('❌ Setup failed:', err.message)
  process.exit(1)
})
