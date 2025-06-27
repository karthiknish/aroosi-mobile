#!/bin/bash

# Workaround for Node.js v20+ compatibility issue with Expo SDK 53
# This script uses Node.js flags to handle TypeScript files properly

export NODE_OPTIONS="--experimental-require-module --experimental-loader ts-node/esm"

# Run expo start with the proper Node.js configuration
node --experimental-require-module ./node_modules/.bin/expo start "$@"