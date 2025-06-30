# Cook Helper Mobile App Deployment Guide

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev
2. **EAS CLI**: Install globally with `npm install -g eas-cli`
3. **Apple Developer Account**: $99/year for iOS deployment
4. **Google Play Console Account**: $25 one-time fee for Android deployment

## Step-by-Step Deployment Process

### 1. Initial Setup

```bash
# Navigate to mobile directory
cd mobile

# Login to Expo
eas login

# Initialize EAS project
eas init

# Configure your project
eas build:configure
```

### 2. Update Configuration

1. **Update app.json**:
   - Set unique `bundleIdentifier` for iOS
   - Set unique `package` name for Android
   - Update version numbers
   - Add your EAS project ID

2. **Environment Variables**:
   Create `.env` file in mobile directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Build for Stores

#### Android Build
```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

#### iOS Build
```bash
# Build for App Store
eas build --platform ios --profile production
```

### 4. Test Your Builds

#### Android Testing
```bash
# Install APK on device/emulator
eas build:run --platform android
```

#### iOS Testing
- Use TestFlight for beta testing
- Submit build to App Store Connect

### 5. Store Submissions

#### Google Play Store

1. **Create App in Play Console**:
   - Go to https://play.google.com/console
   - Create new app
   - Fill in app details

2. **Upload Build**:
   ```bash
   eas submit --platform android
   ```

3. **Store Listing**:
   - Add screenshots
   - Write app description
   - Set pricing and distribution
   - Complete content rating questionnaire

4. **Release**:
   - Submit for review
   - Publish when approved

#### Apple App Store

1. **Create App in App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Create new app
   - Fill in app information

2. **Upload Build**:
   ```bash
   eas submit --platform ios
   ```

3. **App Store Listing**:
   - Add screenshots for all device sizes
   - Write app description and keywords
   - Set pricing and availability
   - Add privacy policy URL

4. **Submit for Review**:
   - Complete all required information
   - Submit for App Store review
   - Respond to any feedback from Apple

### 6. Required Documents

Before submission, ensure you have:

1. **Privacy Policy**: Host at a public URL
2. **Terms of Service**: Host at a public URL
3. **App Icons**: High-resolution versions
4. **Screenshots**: For all required device sizes
5. **App Description**: Compelling and accurate

### 7. Post-Deployment

#### Updates
```bash
# Increment version in app.json
# Build new version
eas build --platform all --profile production

# Submit updates
eas submit --platform all
```

#### Analytics
- Set up app analytics (Firebase, Amplitude, etc.)
- Monitor crash reports
- Track user engagement

### 8. Common Issues & Solutions

#### Build Failures
- Check expo doctor: `expo doctor`
- Verify all dependencies are compatible
- Check build logs in EAS dashboard

#### Store Rejections
- **iOS**: Often due to missing privacy descriptions or guideline violations
- **Android**: Usually metadata or content policy issues

#### Performance
- Optimize images and assets
- Use Expo's optimization tools
- Test on lower-end devices

### 9. Maintenance

#### Regular Tasks
- Monitor app performance
- Respond to user reviews
- Update dependencies
- Fix reported bugs
- Add new features based on feedback

#### Store Optimization
- A/B test app store listings
- Update screenshots with new features
- Optimize keywords and descriptions
- Monitor download and conversion rates

## Support Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

## Cost Breakdown

### One-time Costs
- Apple Developer Program: $99/year
- Google Play Console: $25 one-time

### Ongoing Costs
- EAS Build: Free tier available, paid plans for more builds
- App Store hosting: Included in developer program
- Google Play hosting: Included in console fee

## Timeline

Typical deployment timeline:
- **Setup & Configuration**: 1-2 days
- **Build & Testing**: 2-3 days
- **Store Submission**: 1 day
- **Review Process**: 
  - iOS: 1-7 days
  - Android: 1-3 days
- **Total**: 1-2 weeks for first deployment

Remember: Always test thoroughly before submitting to stores, and be prepared to respond quickly to any review feedback!