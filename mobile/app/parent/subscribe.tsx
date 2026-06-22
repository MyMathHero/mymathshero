import { View, TouchableOpacity, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../lib/themeContext'

export default function SubscribeScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1,
      backgroundColor: colors.bgHeader }}>
      <View style={{ flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#C49A1A',
            fontWeight: '700', fontSize: 15 }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={{ color: 'white', fontWeight: '800',
          fontSize: 16 }}>
          🚀 Subscribe
        </Text>
        <View style={{ width: 60 }} />
      </View>
      <WebView
        source={{ uri: 'https://mymathshero.com.au/subscribe' }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />
    </SafeAreaView>
  )
}
