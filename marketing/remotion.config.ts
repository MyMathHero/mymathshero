import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
// H.264 MP4 — plays everywhere (web, App Store, social).
Config.setCodec('h264')
