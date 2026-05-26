'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Coins, CheckCircle2, ShoppingCart, Sparkles, X } from 'lucide-react'

// Mock student data
const initialStudentData = {
  name: 'Alex',
  coins: 450,
  avatar: '🦊',
  equipped: {
    hair: 'brown_hair',
    accessories: 'cool_sunglasses',
    background: 'default',
    outfits: 'default'
  }
}

// Avatar items by category
const avatarItems = {
  hair: [
    { id: 'brown_hair', name: 'Brown Hair', emoji: '🦊', cost: 0, owned: true },
    { id: 'blonde_hair', name: 'Blonde Hair', emoji: '👱', cost: 80, owned: false },
    { id: 'red_hair', name: 'Red Hair', emoji: '🦁', cost: 80, owned: false },
    { id: 'black_hair', name: 'Black Hair', emoji: '🐼', cost: 80, owned: false },
    { id: 'blue_hair', name: 'Blue Hair', emoji: '💙', cost: 120, owned: false },
    { id: 'rainbow_hair', name: 'Rainbow Hair', emoji: '🌈', cost: 200, owned: false },
  ],
  accessories: [
    { id: 'cool_sunglasses', name: 'Cool Sunglasses', emoji: '😎', cost: 0, owned: true },
    { id: 'reading_glasses', name: 'Reading Glasses', emoji: '🤓', cost: 60, owned: false },
    { id: 'heart_glasses', name: 'Heart Glasses', emoji: '😍', cost: 90, owned: false },
    { id: 'crown', name: 'Crown', emoji: '👑', cost: 200, owned: false },
    { id: 'wizard_hat', name: 'Wizard Hat', emoji: '🧙', cost: 150, owned: false },
    { id: 'pirate_hat', name: 'Pirate Hat', emoji: '🏴‍☠️', cost: 100, owned: false },
  ],
  backgrounds: [
    { id: 'default', name: 'Default', emoji: '⬜', cost: 0, owned: true },
    { id: 'space', name: 'Space', emoji: '🌌', cost: 150, owned: false },
    { id: 'ocean', name: 'Ocean', emoji: '🌊', cost: 150, owned: false },
    { id: 'forest', name: 'Forest', emoji: '🌲', cost: 120, owned: false },
    { id: 'sunset', name: 'Sunset', emoji: '🌅', cost: 180, owned: false },
    { id: 'galaxy', name: 'Galaxy', emoji: '✨', cost: 250, owned: false },
  ],
  outfits: [
    { id: 'default', name: 'Default', emoji: '👕', cost: 0, owned: true },
    { id: 'superhero', name: 'Superhero', emoji: '🦸', cost: 200, owned: false },
    { id: 'astronaut', name: 'Astronaut', emoji: '👨‍🚀', cost: 220, owned: false },
    { id: 'ninja', name: 'Ninja', emoji: '🥷', cost: 180, owned: false },
    { id: 'scientist', name: 'Scientist', emoji: '👨‍🔬', cost: 160, owned: false },
    { id: 'royal', name: 'Royal Outfit', emoji: '🤴', cost: 250, owned: false },
  ],
}

export default function AvatarCustomisation() {
  const router = useRouter()
  const [studentData, setStudentData] = useState(initialStudentData)
  const [activeTab, setActiveTab] = useState('hair')
  const [items, setItems] = useState(avatarItems)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const handleBuyClick = (item) => {
    if (studentData.coins >= item.cost) {
      setSelectedItem(item)
      setShowConfirmModal(true)
    }
  }

  const confirmPurchase = () => {
    if (!selectedItem) return

    // Deduct coins
    setStudentData(prev => ({
      ...prev,
      coins: prev.coins - selectedItem.cost
    }))

    // Mark item as owned
    setItems(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(item =>
        item.id === selectedItem.id ? { ...item, owned: true } : item
      )
    }))

    // Auto-equip the purchased item
    setStudentData(prev => ({
      ...prev,
      equipped: { ...prev.equipped, [activeTab]: selectedItem.id }
    }))

    setShowConfirmModal(false)
    setSelectedItem(null)
  }

  const handleEquip = (item) => {
    setStudentData(prev => ({
      ...prev,
      equipped: { ...prev.equipped, [activeTab]: item.id }
    }))
  }

  const getCurrentAvatar = () => {
    // Simple representation - in real app would composite the avatar
    const equippedItems = studentData.equipped
    const hairItem = items.hair.find(i => i.id === equippedItems.hair)
    return hairItem?.emoji || '🦊'
  }

  const tabs = [
    { id: 'hair', name: 'Hair', emoji: '💇' },
    { id: 'accessories', name: 'Accessories', emoji: '👓' },
    { id: 'backgrounds', name: 'Backgrounds', emoji: '🎨' },
    { id: 'outfits', name: 'Outfits', emoji: '👔' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">

      {/* Header */}
      <div className="pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/student-dashboard')}
              className="flex items-center gap-2 text-[#1B2B4B] hover:text-[#1B2B4B] font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>

            {/* Coin Balance */}
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold text-lg">
              <Coins size={24} className="drop-shadow" />
              <span>{studentData.coins} coins</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1B2B4B] mb-2">
            <Sparkles className="inline-block mr-2 text-[#1B2B4B]" size={32} />
            Customise Your Avatar
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Unlock new items with your coins and make your avatar unique!</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            
            {/* Avatar Preview */}
            <div className="bg-white rounded-3xl shadow-xl p-6 h-fit sticky top-24">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500 mb-3">Your Avatar</p>
                <div className="w-40 h-40 mx-auto bg-gradient-to-br from-[#1B2B4B] to-[#1B2B4B] rounded-full flex items-center justify-center mb-4 shadow-2xl border-4 border-white">
                  <span className="text-8xl">{getCurrentAvatar()}</span>
                </div>
                <p className="font-bold text-[#1B2B4B] text-xl">{studentData.name}</p>
                <p className="text-xs text-gray-400 mt-1">Level 12 Explorer</p>
              </div>
            </div>

            {/* Items Grid */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              {/* Category Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#1B2B4B] to-[#1B2B4B] text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-lg">{tab.emoji}</span>
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                {items[activeTab].map(item => {
                  const isEquipped = studentData.equipped[activeTab] === item.id
                  const canAfford = studentData.coins >= item.cost

                  return (
                    <div
                      key={item.id}
                      className={`bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border-2 transition-all ${
                        isEquipped
                          ? 'border-[#16A34A] shadow-lg shadow-green-100'
                          : 'border-gray-200 hover:border-[#1B2B4B] hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        {/* Item Emoji */}
                        <div className={`text-5xl sm:text-6xl mb-3 ${!item.owned && !canAfford ? 'grayscale opacity-50' : ''}`}>
                          {item.emoji}
                        </div>

                        {/* Item Name */}
                        <p className="font-bold text-[#1B2B4B] text-sm mb-1">{item.name}</p>

                        {/* Item Status */}
                        {item.owned ? (
                          <div className="space-y-2 mt-3">
                            {isEquipped ? (
                              <div className="flex items-center justify-center gap-1.5 bg-[#16A34A] text-white px-3 py-2 rounded-xl text-xs font-bold">
                                <CheckCircle2 size={14} />
                                Equipped
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEquip(item)}
                                className="w-full bg-gradient-to-r from-[#1B2B4B] to-[#1B2B4B] text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform"
                              >
                                Equip
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3">
                            {/* Cost Display */}
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-2">
                              <Coins size={14} className="text-yellow-500" />
                              <span className="font-semibold">{item.cost} coins</span>
                            </div>

                            {/* Buy Button */}
                            <button
                              onClick={() => handleBuyClick(item)}
                              disabled={!canAfford}
                              className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                canAfford
                                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 hover:scale-105 shadow-md hover:shadow-lg'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingCart size={14} />
                              {canAfford ? 'Buy Now' : 'Not Enough Coins'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {showConfirmModal && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="text-6xl mb-4">{selectedItem.emoji}</div>
            <h3 className="text-2xl font-extrabold text-[#1B2B4B] mb-2">Confirm Purchase</h3>
            <p className="text-gray-600 mb-6">
              Spend <span className="font-bold text-yellow-600">{selectedItem.cost} coins</span> on{' '}
              <span className="font-bold">{selectedItem.name}</span>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You have <span className="font-bold text-yellow-600">{studentData.coins} coins</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="flex-1 bg-gradient-to-r from-[#16A34A] to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
