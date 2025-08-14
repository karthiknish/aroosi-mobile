#!/bin/bash

# Script to verify the authentication alignment is working correctly

echo "Verifying authentication alignment..."

# Check if Clerk dependencies are installed
echo "Checking Clerk dependencies..."
if grep -q "@clerk/clerk-expo" package.json; then
  echo "✅ Clerk Expo dependency found"
else
  echo "❌ Clerk Expo dependency not found"
fi

# Check if the new authentication context exists
echo "Checking for new authentication context..."
if [ -f "contexts/ClerkAuthContext.tsx" ]; then
  echo "✅ New ClerkAuthContext.tsx found"
else
  echo "❌ New ClerkAuthContext.tsx not found"
fi

# Check if the old authentication context has been backed up
echo "Checking for backup of old authentication context..."
if [ -f "contexts/AuthContext.tsx.backup" ]; then
  echo "✅ Backup of old AuthContext.tsx found"
else
  echo "ℹ️  Backup of old AuthContext.tsx not found (may not be needed)"
fi

# Check if App.tsx has been updated
echo "Checking App.tsx for ClerkProvider..."
if grep -q "ClerkProvider" App.tsx; then
  echo "✅ ClerkProvider found in App.tsx"
else
  echo "❌ ClerkProvider not found in App.tsx"
fi

# Check if App.tsx uses ClerkAuthProvider
echo "Checking App.tsx for ClerkAuthProvider..."
if grep -q "ClerkAuthProvider" App.tsx; then
  echo "✅ ClerkAuthProvider found in App.tsx"
else
  echo "❌ ClerkAuthProvider not found in App.tsx"
fi

# Check if authentication screens have been updated
echo "Checking authentication screens..."
if grep -q "useClerkAuth" src/screens/auth/LoginScreen.tsx; then
  echo "✅ LoginScreen.tsx uses useClerkAuth"
else
  echo "❌ LoginScreen.tsx does not use useClerkAuth"
fi

if grep -q "useClerkAuth" src/screens/auth/SignUpScreen.tsx; then
  echo "✅ SignUpScreen.tsx uses useClerkAuth"
else
  echo "❌ SignUpScreen.tsx does not use useClerkAuth"
fi

if grep -q "useClerkAuth" src/screens/auth/ForgotPasswordScreen.tsx; then
  echo "✅ ForgotPasswordScreen.tsx uses useClerkAuth"
else
  echo "❌ ForgotPasswordScreen.tsx does not use useClerkAuth"
fi

if grep -q "useClerkAuth" src/screens/auth/ResetPasswordScreen.tsx; then
  echo "✅ ResetPasswordScreen.tsx uses useClerkAuth"
else
  echo "❌ ResetPasswordScreen.tsx does not use useClerkAuth"
fi

# Check if RootNavigator has been updated
echo "Checking RootNavigator..."
if grep -q "useClerkAuth" src/navigation/RootNavigator.tsx; then
  echo "✅ RootNavigator.tsx uses useClerkAuth"
else
  echo "❌ RootNavigator.tsx does not use useClerkAuth"
fi

# Check if SocialAuthButtons has been updated
echo "Checking SocialAuthButtons..."
if grep -q "useClerkAuth" components/auth/SocialAuthButtons.tsx; then
  echo "✅ SocialAuthButtons.tsx uses useClerkAuth"
else
  echo "❌ SocialAuthButtons.tsx does not use useClerkAuth"
fi

# Check if contexts/index.ts has been updated
echo "Checking contexts exports..."
if grep -q "ClerkAuthProvider" contexts/index.ts; then
  echo "✅ contexts/index.ts exports ClerkAuthProvider"
else
  echo "❌ contexts/index.ts does not export ClerkAuthProvider"
fi

# Check for remaining references to old AuthContext in source code
echo "Checking for remaining references to old AuthContext..."
remaining_refs=$(find src hooks components contexts services utils -name "*.tsx" -o -name "*.ts" | xargs grep -l "useAuth.*AuthContext" 2>/dev/null | wc -l)
if [ "$remaining_refs" -eq 0 ]; then
  echo "✅ No remaining references to old AuthContext in source code"
else
  echo "⚠️  $remaining_refs files still reference old AuthContext in source code"
fi

echo "Verification complete."