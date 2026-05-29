import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Profile() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')

  useEffect(() => {
    async function load() {
      setName(await SecureStore.getItemAsync('user_name') || 'Hero')
      setGrade(await SecureStore.getItemAsync('user_grade') || '3')
    }
    load()
  }, [])

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('user_role')
        await SecureStore.deleteItemAsync('user_id')
        await SecureStore.deleteItemAsync('user_name')
        await SecureStore.deleteItemAsync('user_grade')
        router.replace('/login')
      }}
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView style={styles.scroll}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🦸</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.grade}>Grade {grade} Maths Hero</Text>
        </View>
        {[
          { label: 'Name', value: name },
          { label: 'Grade', value: `Grade ${grade}` },
          { label: 'Subject', value: 'Mathematics' },
          { label: 'App Version', value: '1.0.0' },
        ].map((item, i) => (
          <View key={i} style={styles.infoCard}>
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: { flex: 1, padding: 16 },
  avatar: { alignItems: 'center', paddingVertical: 32,
    backgroundColor: 'white', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0' },
  avatarEmoji: { fontSize: 64, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '800', color: '#1B2B4B' },
  grade: { fontSize: 14, color: '#C49A1A', fontWeight: '600', marginTop: 4 },
  infoCard: { backgroundColor: 'white', borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { color: '#1B2B4B', fontWeight: '700', fontSize: 14 },
  logoutBtn: { backgroundColor: '#EF4444', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 16 },
  logoutText: { color: 'white', fontWeight: '800', fontSize: 16 },
})
