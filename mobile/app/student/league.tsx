import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function League() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const medals = ['🥇', '🥈', '🥉']

  useEffect(() => {
    async function load() {
      const id = await SecureStore.getItemAsync('user_id') || ''
      setMyId(id)
      try {
        const res = await studentAPI.leaderboard(id)
        setData(res.data)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hero League 🏆</Text>
        <View style={{ width: 48 }} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C49A1A" size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          <Text style={styles.resetText}>Resets monthly · Top 10 win prizes!</Text>
          {(data?.leaderboard || []).map((entry: any, i: number) => (
            <View key={i} style={[styles.row, entry.studentId === myId && styles.rowMe]}>
              <Text style={styles.rank}>{i < 3 ? medals[i] : `#${i + 1}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.grade}>Grade {entry.grade} · Maths</Text>
              </View>
              <Text style={styles.points}>{entry.xp} pts</Text>
            </View>
          ))}
          {(!data?.leaderboard || data.leaderboard.length === 0) && (
            <Text style={styles.resetText}>No leaderboard data yet — start practising to climb!</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
    backgroundColor: '#1B2B4B' },
  back: { color: '#C49A1A', fontWeight: '700', fontSize: 15 },
  title: { color: 'white', fontWeight: '800', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, padding: 16 },
  resetText: { color: '#64748B', fontSize: 13,
    textAlign: 'center', marginBottom: 16 },
  row: { backgroundColor: 'white', borderRadius: 12, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0' },
  rowMe: { borderColor: '#C49A1A', backgroundColor: '#FFFBEB', borderWidth: 2 },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#1B2B4B' },
  grade: { fontSize: 12, color: '#94A3B8' },
  points: { fontSize: 15, fontWeight: '800', color: '#C49A1A' },
})
