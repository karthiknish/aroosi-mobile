const { getDefaultConfig } = require('expo/metro-config');
const path = require("path");

const config = getDefaultConfig(__dirname);

// Workaround for Expo SDK 53 + Firebase dual-package hazard
config.resolver = config.resolver || {};
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), 'cjs'])
);
// Re-enabled package exports in SDK 54 by relying on Metro defaults (true)
// Previously forced off for SDK 53 Firebase issues.

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

// Add path aliases
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@components': path.resolve(__dirname, 'components'),
  '@screens': path.resolve(__dirname, 'src/screens'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@services': path.resolve(__dirname, 'services'),
  '@contexts': path.resolve(__dirname, 'contexts'),
  '@constants': path.resolve(__dirname, 'constants'),
  '@/constants': path.resolve(__dirname, 'src/constants'),
  '@src': path.resolve(__dirname, 'src'),
  '@utils': path.resolve(__dirname, 'utils'),
  '@providers': path.resolve(__dirname, 'providers'),
  '@navigation': path.resolve(__dirname, 'src/navigation'),
  '@validation': path.resolve(__dirname, 'src/validation'),
  '@/validation': path.resolve(__dirname, 'src/validation'),
  '@types': path.resolve(__dirname, 'types'),
  '@/types': path.resolve(__dirname, 'types'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/screens': path.resolve(__dirname, 'src/screens'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/utils': path.resolve(__dirname, 'utils'),
  '@/navigation': path.resolve(__dirname, 'src/navigation'),
  '@/providers': path.resolve(__dirname, 'providers')
};

// Watch additional folders for changes
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, 'components'),
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'src/screens'),
  path.resolve(__dirname, 'src/components'),
  path.resolve(__dirname, 'services'),
  path.resolve(__dirname, 'contexts'),
  path.resolve(__dirname, 'constants'),
  path.resolve(__dirname, 'src/constants'),
  path.resolve(__dirname, 'src/validation'),
  path.resolve(__dirname, 'types'),
  path.resolve(__dirname, 'utils'),
  path.resolve(__dirname, 'providers')
];

module.exports = config;

// Ignore Hermes virtual bytecode stack frames during symbolication to prevent
// "ENOENT: no such file or directory, open '.../InternalBytecode.js'" warnings.
// Metro will try to read this virtual file when symbolicating errors; returning
// 404 short-circuits the lookup without affecting the bundle.

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      if (req.url && req.url.includes('InternalBytecode.js')) {
        res.writeHead(404);
        return res.end();
      }
      return middleware(req, res, next);
    };
  },
};