# Hooks Type Error Fix Checklist

This checklist tracks the process of fixing all type errors in the `aroosi-mobile/hooks` directory.

## Legend
- [ ] Not started
- [x] Fixed
- [~] In progress/partial

---

## Checklist

### 1. [x] `index.ts`
   - [x] Export style matches (default/named)
   - [x] All exports type-safe

### 2. [x] `useAudioPlayback.ts`
   - [x] State types match interface
   - [x] Return type matches `UseAudioPlaybackResult`
   - [x] All async functions return correct types

### 3. [x] `useFeatureAccess.ts`
   - [x] All methods match `UseFeatureAccessReturn`
   - [x] Generics used correctly
   - [x] API client types correct

### 4. [~] `useInAppPurchase.ts`
   - [ ] All async functions return correct types
   - [ ] State and return types match interfaces
   - [ ] Error handling is type-safe

### 5. [ ] `useInterests.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 6. [ ] `useMessageStatus.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 7. [ ] `useMessaging.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 8. [ ] `useOneSignal.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 9. [ ] `usePhotoManagement.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 10. [ ] `useRetry.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 11. [ ] `useSafety.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 12. [ ] `useSubscription.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 13. [ ] `useTypingIndicator.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

### 14. [ ] `useVoiceRecording.ts`
   - [ ] All methods type-safe
   - [ ] API client types correct

---

## General
- [ ] All hooks have explicit return types
- [ ] All hooks use correct generics for useState/useCallback/useQuery
- [ ] All API client calls are type-safe
- [ ] All error handling is type-safe 