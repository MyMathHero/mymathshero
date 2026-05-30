// Hero avatar item catalogue + helpers.
// Each item has { id, name, emoji, cost, default? }. Free items (cost: 0) are
// always available; paid items must be unlocked once, then equipped.

export const AVATAR_ITEMS = {
  heroStyle: [
    { id: 'classic', name: 'Classic Hero', emoji: '🦸', cost: 0, default: true },
    { id: 'space',   name: 'Space Hero',   emoji: '🚀', cost: 100 },
    { id: 'ninja',   name: 'Ninja Hero',   emoji: '🥷', cost: 150 },
    { id: 'super',   name: 'Superhero',    emoji: '⚡', cost: 200 },
  ],
  cape: [
    { id: 'gold',      name: 'Gold Cape',      emoji: '🟡', cost: 0, default: true },
    { id: 'red',       name: 'Red Cape',       emoji: '🔴', cost: 50 },
    { id: 'blue',      name: 'Blue Cape',      emoji: '🔵', cost: 50 },
    { id: 'rainbow',   name: 'Rainbow Cape',   emoji: '🌈', cost: 150 },
    { id: 'invisible', name: 'Invisible Cape', emoji: '✨', cost: 200 },
  ],
  accessory: [
    { id: 'none',      name: 'No Accessory',  emoji: '⬜', cost: 0, default: true },
    { id: 'crown',     name: 'Crown',         emoji: '👑', cost: 100 },
    { id: 'star',      name: 'Star Badge',    emoji: '⭐', cost: 75 },
    { id: 'lightning', name: 'Lightning Bolt', emoji: '⚡', cost: 75 },
    { id: 'belt',      name: 'Champion Belt', emoji: '🏆', cost: 150 },
  ],
  background: [
    { id: 'classic',    name: 'Classic',    emoji: '🌟', cost: 0, default: true },
    { id: 'space',      name: 'Space',      emoji: '🌌', cost: 80 },
    { id: 'underwater', name: 'Underwater', emoji: '🌊', cost: 80 },
    { id: 'galaxy',     name: 'Galaxy',     emoji: '🪐', cost: 120 },
  ],
}

export const AVATAR_CATEGORIES = [
  { id: 'heroStyle',  label: 'Hero Style', emoji: '🦸' },
  { id: 'cape',       label: 'Cape',       emoji: '🎨' },
  { id: 'accessory',  label: 'Accessory',  emoji: '👑' },
  { id: 'background', label: 'Background', emoji: '🌟' },
]

export function getDefaultAvatar() {
  return {
    heroStyle:  'classic',
    cape:       'gold',
    accessory:  'none',
    background: 'classic',
  }
}

export function renderAvatarPreview(avatarConfig) {
  const style = AVATAR_ITEMS.heroStyle.find(i => i.id === avatarConfig?.heroStyle) || AVATAR_ITEMS.heroStyle[0]
  const cape  = AVATAR_ITEMS.cape.find(i => i.id === avatarConfig?.cape)           || AVATAR_ITEMS.cape[0]
  const acc   = AVATAR_ITEMS.accessory.find(i => i.id === avatarConfig?.accessory) || AVATAR_ITEMS.accessory[0]

  return `${acc.id !== 'none' ? acc.emoji : ''}${style.emoji}${cape.emoji}`
}
