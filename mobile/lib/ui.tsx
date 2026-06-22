// Shared visual primitives — the centralised "premium" design language.
// Every screen composes these so the whole app stays consistent and theme-aware
// (light / dark / colour-safe). Visual only: no business logic lives here.
//
// Expo SDK 56 — uses expo-linear-gradient (already a dependency).

import React from 'react'
import {
  View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp,
  TouchableOpacity, TouchableOpacityProps, ScrollView, ScrollViewProps,
  ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from './themeContext'

// Theme background images (full-screen). Colour-safe falls back to the light one.
const BG_LIGHT = require('../assets/images/bg-light.png')
const BG_DARK = require('../assets/images/bg-dark.png')

// ── ScreenBackground ────────────────────────────────────────────────────────
// Full-screen base: the theme background image fills the screen behind all
// content (dark image in dark theme, light otherwise). bgPrimary shows while the
// image loads / as the underlying colour.
export function ScreenBackground({
  children, style,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, themeId } = useTheme()
  return (
    <ImageBackground
      source={themeId === 'dark' ? BG_DARK : BG_LIGHT}
      resizeMode="cover"
      style={[{ flex: 1, backgroundColor: colors.bgPrimary }, style]}
    >
      {children}
    </ImageBackground>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────
// Themed surface with soft radius + gentle shadow. `glow` adds a gold halo,
// `gold` adds a subtle gold border (used for the premium challenge cards).
export function Card({
  children, style, glow = false, gold = false, elevated = false,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  glow?: boolean
  gold?: boolean
  elevated?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? colors.cardElevated : colors.bgCard,
          borderRadius: 16,                         // spec: cards ≥ 16
          borderWidth: 1,
          borderColor: gold ? colors.accentGold + '55' : colors.cardBorder,
          // spec shadow: #000, offset 0/2, opacity 0.08, radius 8, elevation 3
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// ── GlowBar ─────────────────────────────────────────────────────────────────
// The signature glowing gold progress bar (Hero Points + skill progress).
// `progress` is 0..1. `height` defaults to 10.
export function GlowBar({
  progress, height = 10, style,
}: { progress: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const pct = Math.max(0, Math.min(1, progress))
  return (
    <View
      style={[
        {
          height,
          borderRadius: height,
          backgroundColor: colors.borderColor,
          overflow: 'visible',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View style={{ height, borderRadius: height, overflow: 'hidden', backgroundColor: colors.accentGold + '22' }}>
        <LinearGradient
          colors={colors.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height }}
        />
      </View>
    </View>
  )
}

// ── StatPill ────────────────────────────────────────────────────────────────
// Rounded stat/value chip used in the stats strip + skill chips.
export function StatPill({
  children, style, active = false,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: active ? colors.accentGoldLight : colors.bgCard,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: active ? colors.accentGold + '66' : colors.cardBorder,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// ── GradientButton ──────────────────────────────────────────────────────────
// Gold gradient CTA. Pass `title` or children. Keeps all touch behaviour.
export function GradientButton({
  title, children, style, textStyle, ...rest
}: TouchableOpacityProps & {
  title?: string
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity activeOpacity={0.85} {...rest}>
      <LinearGradient
        colors={colors.goldGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 18,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.glow,
            shadowOpacity: 0.8,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 5,
          },
          style,
        ]}
      >
        {title ? <Text style={[{ color: '#1B2B4B', fontWeight: '800', fontSize: 15 }, textStyle]}>{title}</Text> : children}
      </LinearGradient>
    </TouchableOpacity>
  )
}

// ── SectionHeader ───────────────────────────────────────────────────────────
export function SectionHeader({
  title, subtitle, right, style,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

const _s = StyleSheet.create({}) // reserved for future static styles
export { _s }
