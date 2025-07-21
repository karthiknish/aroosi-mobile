# Vercel WebSocket Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the WebSocket functionality to Vercel and ensuring full compatibility between the web platform and aroosi-mobile.

## Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Access to Vercel dashboard
- Environment variables configured

## 1. Web Platform Deployment

### Environment Variables
Add these to your Vercel project settings (never hardcode URLs):

```bash
# Production - Set in Vercel dashboard
NEXT_PUBLIC_WS_URL=wss://your-domain.vercel.app/api/websocket

# Development - Use .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/websocket
```

### Mobile Environment Variables
Add to your `.env` file (never commit to version control):

```bash
# Production
EXPO_PUBLIC_WS_URL=wss://your-domain.vercel.app/api/websocket

# Development
EXPO_PUBLIC_WS_URL=ws://localhost:3000/api/websocket

# Testing
VERCEL_URL=your-domain.vercel.app
```

### Deploy WebSocket Edge Function
The Edge Function is already configured at `aroosi/api/websocket/route.ts`. It includes:
- ✅ Vercel Edge Runtime compatibility
- ✅ Mobile message format alignment
- ✅ Connection management
- ✅ Heartbeat support
- ✅ Error handling

## 2. Mobile Platform Configuration

### Environment Variables
Add to your `.env` file:

```bash
# Production
EXPO_PUBLIC_WS_URL=wss://your-domain.vercel.app/api/websocket

# Development
EXPO_PUBLIC_WS_URL=ws://localhost:3000/api/websocket
```

### Configuration Files Updated
- ✅ `aroosi-mobile/utils/websocketConfig.ts` - Vercel-compatible configuration
- ✅ `aroosi-mobile/hooks/useRealtimeMessaging.ts` - Updated to use new config
- ✅ `aroosi-mobile/services/RealtimeMessagingService.ts` - Full Vercel compatibility

## 3. Testing Checklist

### Pre-deployment Testing
```bash
# Test locally
npm run dev
# WebSocket should connect at ws://localhost:3000/api/websocket
```

### Post-deployment Testing
```bash
# Deploy to Vercel
vercel --prod

# Test WebSocket connection
# Use the WebSocketTest component in the web app
# Test mobile app with production URL
```

### Verification Steps
1. **Web Platform**: Navigate to `/test-websocket` route
2. **Mobile Platform**: Use the app with production WebSocket URL
3. **Cross-platform**: Send messages between web and mobile
4. **Connection Stability**: Test reconnection after network interruption
5. **Message Delivery**: Verify all message types work correctly

## 4. Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check Vercel function logs: `vercel logs --follow`
- Verify environment variables are set correctly
- Ensure Edge Function is deployed: Check `/api/websocket` route

#### Mobile Connection Issues
- Check `EXPO_PUBLIC_WS_URL` is set correctly
- Verify SSL certificate (use `wss://` for production)
- Test with `npx expo start --tunnel` for external testing

#### Message Format Mismatch
- Ensure both platforms use identical message formats
- Check RealtimeMessagingService message validation
- Verify Edge Function message parsing

### Debug Commands
```bash
# Check Vercel deployment
vercel ls

# View logs
vercel logs --follow

# Test WebSocket manually
wscat -c wss://your-domain.vercel.app/api/websocket
```

## 5. Performance Optimization

### Vercel Edge Function Limits
- **Timeout**: 30 seconds (for initial connection)
- **Memory**: 128MB (sufficient for WebSocket management)
- **Cold Start**: Minimal due to Edge Runtime

### Mobile Optimizations
- **Reconnection**: Exponential backoff implemented
- **Heartbeat**: 30-second intervals
- **Message Queuing**: Offline message support
- **Battery Optimization**: Background disconnection

## 6. Monitoring

### Vercel Analytics
- Enable Vercel Analytics in dashboard
- Monitor WebSocket connection metrics
- Track error rates and response times

### Mobile Monitoring
- Use React Native performance monitoring
- Track connection success/failure rates
- Monitor message delivery latency

## 7. Rollback Plan

If issues occur:
1. Revert to previous deployment in Vercel dashboard
2. Update mobile app to use fallback WebSocket URL
3. Notify users of temporary service disruption
4. Debug and fix issues in staging environment

## 8. Security Considerations

- All WebSocket connections use WSS (WebSocket Secure)
- Authentication tokens validated on connection
- Rate limiting implemented for message sending
- Input validation for all message types

## Support
For issues or questions:
- Check Vercel function logs
- Review mobile app logs
- Test with provided debugging tools
- Contact development team with specific error messages