import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ManageSubscriptionScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1,
      backgroundColor: '#1B2B4B' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#C49A1A',
            fontWeight: '700', fontSize: 15 }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={{ color: 'white', fontWeight: '800',
          fontSize: 16 }}>
          💳 Subscription
        </Text>
        <View style={{ width: 60 }} />
      </View>
      <WebView
        source={{ uri: 'https://mymathshero.com.au/manage-subscription' }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16 },
})
