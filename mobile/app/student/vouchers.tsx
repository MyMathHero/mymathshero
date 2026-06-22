import { useEffect, useState, useMemo} from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from '../../lib/ui'
import { voucherAPI } from '../../lib/api'
import { theme } from '../../lib/theme'

// Mirror of web's lib/arcadeVouchers.js. The server is the source of truth —
// it validates tier IDs and pricing on POST — but we need the labels locally
// for the cards. Keep in sync with web/lib/arcadeVouchers.js.
type Tier = {
  id: string
  name: string
  emoji: string
  coinsCost: number
  description: string
  value: string
  color: string
  lightColor: string
}
type Voucher = {
  _id?: string
  tierId: string
  tierName: string
  tierValue: string
  emoji: string
  code: string
  status: 'pending' | 'sent' | 'redeemed' | string
  coinsSpent: number
  createdAt?: string
}

export default function VouchersScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await voucherAPI.list()
      const data = res?.data || {}
      setCoins(data.coins || 0)
      setVouchers(Array.isArray(data.vouchers) ? data.vouchers : [])
      setTiers(Array.isArray(data.tiers) ? data.tiers : [])
    } catch (err: any) {
      // 401 → bounce to login. Anything else → keep the screen but show empty.
      const status = err?.response?.status
      if (status === 401) {
        router.replace('/login')
        return
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function onRefresh() {
    setRefreshing(true)
    load()
  }

  function confirmRedeem(tier: Tier) {
    if (coins < tier.coinsCost) {
      Alert.alert(
        'Not enough coins',
        `You need ${tier.coinsCost - coins} more coins 🪙 for the ${tier.name}.`
      )
      return
    }
    Alert.alert(
      `Redeem ${tier.name}?`,
      `Spend ${tier.coinsCost} coins 🪙 for ${tier.value} Hero Arcade Credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redeem', style: 'default', onPress: () => redeem(tier) },
      ]
    )
  }

  async function redeem(tier: Tier) {
    if (redeeming) return
    setRedeeming(tier.id)
    try {
      const res = await voucherAPI.redeem(tier.id)
      const data = res?.data
      if (data?.success) {
        setCoins(typeof data.newCoins === 'number' ? data.newCoins : coins)
        if (data.voucher) setVouchers(prev => [data.voucher, ...prev])
        Alert.alert(
          '🎉 Voucher Redeemed!',
          data.message || `${tier.name} redeemed — check your parent's email.`
        )
      } else {
        Alert.alert('Could not redeem', data?.error || 'Try again later.')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Connection error'
      Alert.alert('Could not redeem', msg)
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator color={theme.colors.gold} size="large" />
        <Text style={s.loadingText}>Loading vouchers…</Text>
      </SafeAreaView>
    )
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>🎟️ Hero Vouchers</Text>
        <View style={s.pointsPill}>
          <Text style={s.pointsText}>🪙 {coins}</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.gold}
          />
        }
      >
        {/* How it works */}
        <View style={s.howCard}>
          <Text style={s.howTitle}>🕹️ How Hero Vouchers Work</Text>
          {[
            '1. Answer Maths questions to earn coins 🪙',
            '2. Reach enough coins to unlock a tier',
            '3. Redeem your coins for Hero Arcade Credits',
            "4. Your parent gets the code by email",
          ].map((line, i) => (
            <Text key={i} style={s.howLine}>{line}</Text>
          ))}
        </View>

        {/* Tiers */}
        <Text style={s.sectionTitle}>Available Vouchers</Text>
        {tiers.length === 0 ? (
          <Text style={s.empty}>No tiers available.</Text>
        ) : tiers.map(tier => {
          const canAfford = coins >= tier.coinsCost
          const needed = tier.coinsCost - coins
          return (
            <TouchableOpacity
              key={tier.id}
              onPress={() => confirmRedeem(tier)}
              activeOpacity={0.85}
              disabled={!canAfford || redeeming === tier.id}
              style={[
                s.tierCard,
                {
                  backgroundColor: canAfford ? tier.lightColor : 'white',
                  borderColor: canAfford ? tier.color : '#E2E8F0',
                },
              ]}
            >
              <Text style={s.tierEmoji}>{tier.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.tierName}>{tier.name}</Text>
                <Text style={s.tierDesc}>{tier.description}</Text>
                {!canAfford && (
                  <Text style={s.tierNeed}>Need {needed} more points</Text>
                )}
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.tierValue, { color: tier.color }]}>{tier.value}</Text>
                <View
                  style={[
                    s.tierBtn,
                    {
                      backgroundColor: canAfford ? theme.colors.navy : '#E2E8F0',
                      borderColor: canAfford ? theme.colors.gold : 'transparent',
                    },
                  ]}
                >
                  <Text style={[
                    s.tierBtnText,
                    { color: canAfford ? 'white' : '#94A3B8' },
                  ]}>
                    {redeeming === tier.id ? '…' : `🪙 ${tier.coinsCost}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* My vouchers */}
        {vouchers.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>My Vouchers</Text>
            {vouchers.map((v, i) => (
              <View key={v._id || i} style={s.voucherRow}>
                <Text style={s.voucherEmoji}>{v.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.voucherName}>{v.tierName}</Text>
                  <Text style={s.voucherRef}>Ref: {v.code}</Text>
                </View>
                <View style={[
                  s.statusPill,
                  v.status === 'redeemed' ? { backgroundColor: '#DCFCE7' }
                  : v.status === 'sent' ? { backgroundColor: '#EFF6FF' }
                  : { backgroundColor: '#FFFBEB' },
                ]}>
                  <Text style={[
                    s.statusText,
                    v.status === 'redeemed' ? { color: '#166534' }
                    : v.status === 'sent' ? { color: '#1E40AF' }
                    : { color: '#92400E' },
                  ]}>
                    {v.status === 'redeemed' ? '✅ Used'
                      : v.status === 'sent' ? '📧 Code sent'
                      : '⏳ Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    flex: 1, backgroundColor: c.bgPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: c.accentGold, marginTop: 12, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: 'transparent',
  },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  title: { color: c.textPrimary, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
  pointsPill: {
    backgroundColor: 'rgba(196,154,26,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  pointsText: { color: c.accentGold, fontWeight: '800', fontSize: 13 },

  scroll: { flex: 1 },

  howCard: {
    backgroundColor: c.bgHeader,
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: c.accentGold,
  },
  howTitle: {
    color: c.accentGold, fontWeight: '800',
    fontSize: 15, marginBottom: 8,
  },
  howLine: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13, marginVertical: 3,
  },

  sectionTitle: {
    fontWeight: '800', color: c.textPrimary,
    fontSize: 16, marginBottom: 12,
  },
  empty: { color: c.textMuted, fontSize: 14, paddingVertical: 12 },

  tierCard: {
    borderRadius: 16, borderWidth: 2,
    padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  tierEmoji: { fontSize: 40 },
  tierName: { fontWeight: '800', color: c.textPrimary, fontSize: 16, marginBottom: 2 },
  tierDesc: { color: c.textSecondary, fontSize: 13 },
  tierNeed: { color: c.error, fontSize: 12, fontWeight: '600', marginTop: 2 },
  tierValue: { fontWeight: '800', fontSize: 20, marginBottom: 6 },
  tierBtn: {
    borderRadius: 10, borderWidth: 2,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 80, alignItems: 'center',
  },
  tierBtnText: { fontWeight: '700', fontSize: 12 },

  voucherRow: {
    backgroundColor: c.bgCard, borderRadius: 14,
    padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: c.borderColor,
  },
  voucherEmoji: { fontSize: 28 },
  voucherName: { fontWeight: '700', color: c.textPrimary, fontSize: 14 },
  voucherRef: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
})
