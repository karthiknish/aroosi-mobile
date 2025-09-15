/**
 * React Native CLI configuration
 *
 * We conditionally disable autolinking for react-native-iap on Android for local builds
 * to bypass Nitro-related compile errors. Enable by setting DISABLE_IAP_ANDROID=1.
 */

const disableIapAndroid = process.env.DISABLE_IAP_ANDROID === '1';

/** @type {import('@react-native-community/cli-types').Config} */
const config = {
  dependencies: {
    ...(disableIapAndroid
      ? {
          'react-native-iap': {
            platforms: {
              android: null,
            },
          },
        }
      : {}),
  },
};

module.exports = config;
