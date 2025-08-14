#!/bin/bash

# Script to help automate the remaining authentication alignment updates

echo "Starting authentication alignment update script..."

# 1. Update imports from AuthContext to ClerkAuthContext
echo "Updating imports from AuthContext to ClerkAuthContext..."

# Find all files that import useAuth from AuthContext and update them
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "import.*useAuth.*AuthContext" | while read file; do
  echo "Updating $file"
  sed -i '' 's/import { useAuth } from .*AuthContext.*/import { useClerkAuth } from "..\/contexts\/ClerkAuthContext"/g' "$file"
done

# Find all files that import AuthProvider from AuthContext and update them
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "import.*AuthProvider.*AuthContext" | while read file; do
  echo "Updating $file"
  sed -i '' 's/import { AuthProvider } from .*AuthContext.*/import { ClerkAuthProvider } from "..\/contexts\/ClerkAuthContext"/g' "$file"
done

# 2. Update useAuth calls to useClerkAuth (but preserve destructuring)
echo "Updating useAuth calls to useClerkAuth..."

# Find all files that use useAuth and update them, but preserve the destructuring
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "const {.*} = useAuth()" | while read file; do
  echo "Updating $file"
  # This is a more complex replacement that preserves the destructuring
  # We'll need to manually update these files
done

echo "Script completed. Please review the changes and make any necessary manual adjustments."
echo "Note: Files with destructuring assignments from useAuth() need to be manually updated"
echo "to use the correct properties from useClerkAuth()."