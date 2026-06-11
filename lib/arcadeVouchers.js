// Hero Arcade Credit tiers — single source of truth shared between web,
// mobile and admin. The tier IDs are stable; change the user-facing strings
// here without touching call sites.
//
// TODO(partnership): once a real third-party arcade partnership is signed
// (Timezone or similar), swap `description`/`value` strings to that brand and
// add a `partner` field. Until then we ship as generic "Hero Arcade Credits"
// to avoid misrepresenting a non-existent partnership in customer emails.

export const VOUCHER_TIERS = [
  {
    id: 'bronze',
    name: 'Bronze Hero Card',
    emoji: '🥉',
    coinsCost: 100,
    description: '$5 Hero Arcade Credits',
    value: '$5',
    color: '#CD7F32',
    lightColor: '#FEF3C7',
    minAge: 5,
  },
  {
    id: 'silver',
    name: 'Silver Hero Card',
    emoji: '🥈',
    coinsCost: 250,
    description: '$10 Hero Arcade Credits',
    value: '$10',
    color: '#C0C0C0',
    lightColor: '#F8FAFC',
    minAge: 5,
  },
  {
    id: 'gold',
    name: 'Gold Hero Card',
    emoji: '🥇',
    coinsCost: 500,
    description: '$20 Hero Arcade Credits',
    value: '$20',
    color: '#C49A1A',
    lightColor: '#FFFBEB',
    minAge: 5,
  },
  {
    id: 'platinum',
    name: 'Platinum Hero Card',
    emoji: '💎',
    coinsCost: 1000,
    description: '$50 Hero Arcade Credits',
    value: '$50',
    color: '#60A5FA',
    lightColor: '#EFF6FF',
    minAge: 5,
  },
]

export function getVoucherTier(tierId) {
  return VOUCHER_TIERS.find(t => t.id === tierId) || null
}
