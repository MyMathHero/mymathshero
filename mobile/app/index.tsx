import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      const role = await SecureStore.getItemAsync('user_role')
      if (!token) {
        router.replace('/login')
        return
      }
      if (role === 'student') router.replace('/student/dashboard')
      else if (role === 'parent') router.replace('/parent/dashboard')
      else router.replace('/login')
    } catch {
      router.replace('/login')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        MyMaths<Text style={styles.gold}>Hero</Text>
      </Text>
      <ActivityIndicator
        color="#C49A1A"
        size="large"
        style={{ marginTop: 24 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
  },
  gold: { color: '#C49A1A' },
})
