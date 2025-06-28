const { getDefaultConfig } = require('expo/metro-config');
const path = require("path");

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