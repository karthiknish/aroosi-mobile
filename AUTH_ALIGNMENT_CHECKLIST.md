# Aroosi Mobile Authentication Alignment - Remaining Tasks

## API Service Updates
- [ ] Update `services/auth.ts` to use Clerk authentication instead of cookie-based system
- [ ] Update `services/http.ts` to work with Clerk's authentication flow
- [ ] Update any other service files that make API calls to use Clerk authentication

## Constants Updates
- [ ] Review `constants/index.ts` to ensure API_BASE_URL is correct for Clerk integration
- [ ] Update any other constants that may be related to authentication

## Component Updates
- [ ] Search for any remaining components using `useAuth` and update them to use `useClerkAuth`
- [ ] Update any components that directly interact with the authentication system

## Testing
- [ ] Test email/password sign in
- [ ] Test email/password sign up
- [ ] Test Google OAuth sign in
- [ ] Test password reset flow
- [ ] Test sign out functionality
- [ ] Test session persistence across app restarts
- [ ] Test all API endpoints that require authentication

## Documentation
- [ ] Update any documentation that references the old authentication system
- [ ] Ensure all team members are aware of the changes
- [ ] Update any setup guides or README files

## Cleanup
- [ ] Remove the old `AuthContext.tsx` file once migration is complete
- [ ] Remove any unused code or dependencies
- [ ] Update package.json if any dependencies are no longer needed