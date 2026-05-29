// Metro config for the nested Expo app.
// The app lives inside the parent Next.js repo. Scope Metro's file watching to
// this project so it doesn't crawl the parent tree. Module resolution is left at
// Expo defaults — Node/Metro already resolve `react` from this project's own
// node_modules (verified: mobile/node_modules/react@19.2.3) before any parent copy.
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

config.watchFolders = [projectRoot]

module.exports = config
