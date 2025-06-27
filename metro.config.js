const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional asset extensions
config.resolver.assetExts.push(
  // Audio formats
  'mp3',
  'wav',
  'aac',
  'm4a',
  'ogg',
  // Video formats
  'mp4',
  'mov',
  'avi',
  'mkv',
  // Font formats
  'ttf',
  'otf',
  'woff',
  'woff2',
  // Other formats
  'zip',
  'pdf',
  'doc',
  'docx'
);

module.exports = config;