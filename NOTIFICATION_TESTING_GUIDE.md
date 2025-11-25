# Push Notification Testing Guide

## 📋 Prerequisites

1. ✅ FCM configured (google-services.json in place)
2. ✅ App rebuilt with notification permissions
3. ✅ Two devices/emulators OR two different accounts on same device
4. ✅ Both users registered in Firebase

---

## 🧪 Testing Steps

### Step 1: Professional Setup (Device 1)

1. **Login as Medical Professional:**
   - Open app
   - Login with professional account (e.g., "rumi")
   - Navigate to Professional Home Screen

2. **Check Token Registration:**
   - App will automatically request notification permission
   - Click "Allow" when prompted
   - Check console logs for:
     ```
     ✅ Expo push token obtained: ExponentPushToken[...]
     ✅ Push token saved to Firebase for user: [UID]
     ```

3. **Verify in Firebase:**
   - Go to Firebase Console → Realtime Database
   - Navigate to: `users/[professionalUID]/expoPushToken`
   - Should see: `ExponentPushToken[...]`
   - ✅ If token exists, professional is ready

4. **Keep App Open (or send to background):**
   - For foreground testing: Keep app open
   - For background testing: Press home button (app in background)

---

### Step 2: Regular User Setup (Device 2 or Different Account)

1. **Login as Regular User:**
   - Open app (on different device OR logout and login as regular user)
   - Login with regular user account
   - Navigate to Home Screen

2. **Go to Report a Problem:**
   - Click "Report a Problem" card
   - Fill the form:
     - Problem Type: Select any (e.g., "Burn")
     - Description: "Testing notification feature"
     - Pain Level: Select any (e.g., "Moderate")
     - **Select Medical Professional:** Choose the professional from Step 1
     - Phone Number: Enter valid number
     - Location: Enter location (optional)
     - Photo: Optional

3. **Submit Report:**
   - Click "SUBMIT REPORT"
   - Check console logs for:
     ```
     ✅ Report saved successfully with ID: [reportId]
     ✅ Found push token for professional: ExponentPushToken[...]
     ✅ Notification sent successfully to professional
     ```

---

### Step 3: Check Notification on Professional Device

#### If App is in Background:
1. **Notification should appear in notification bar:**
   - Title: "New Emergency Report"
   - Body: "[UserName] needs your help at [Location]. Problem: [ProblemType]"
   - Sound should play
   - Notification icon should show

2. **Tap the notification:**
   - App should open
   - Report details modal should open automatically
   - Report should appear in "Incoming Emergency" section

#### If App is in Foreground:
1. **Check console logs:**
   ```
   📬 Notification received: {...}
   🔔 Notification handler called: {...}
   ✅ Notification displayed in notification bar
   ```

2. **Check app UI:**
   - Alert count should increase
   - New report should appear in "Incoming Emergency" section
   - Report card should show with patient info

---

## 🔍 Verification Checklist

### ✅ Professional Side:
- [ ] Push token registered in Firebase
- [ ] Notification permission granted
- [ ] Token saved to `users/{uid}/expoPushToken`

### ✅ Report Submission:
- [ ] Report saved to Firebase
- [ ] Professional's token fetched successfully
- [ ] Notification API call successful
- [ ] Console shows "Notification sent successfully"

### ✅ Notification Delivery:
- [ ] Notification appears in notification bar
- [ ] Sound plays
- [ ] Notification has correct title and body
- [ ] Tapping notification opens app
- [ ] Report appears in alerts/reports list

---

## 🐛 Troubleshooting

### Issue: "Professional does not have push token registered"
**Solution:**
1. Professional must login first
2. Check Firebase: `users/{professionalUID}/expoPushToken`
3. If missing, professional needs to login again

### Issue: Notification not appearing
**Check:**
1. **Device Settings:**
   - Settings → Apps → DokTap → Notifications
   - Ensure "Show notifications" is ON
   - Check "Default" channel is enabled

2. **App State:**
   - Background: Notification should appear automatically
   - Foreground: Check console logs for notification received

3. **Token:**
   - Verify token in Firebase matches logged-in professional
   - Token should start with `ExponentPushToken[`

4. **Network:**
   - Ensure device has internet connection
   - Check Expo Push API response in console

### Issue: Notification appears but report doesn't show
**Check:**
1. Console logs for report loading
2. Verify `assignedProfessionalId` matches professional UID
3. Check report `status` and `accepted` fields
4. Reports with `accepted: true` won't show in alerts

### Issue: "Notification API response" shows error
**Check:**
1. Token format is correct
2. Network connection is stable
3. Expo Push API is accessible
4. Response shows `status: "ok"`

---

## 📱 Quick Test (Single Device)

If you only have one device:

1. **Login as Professional:**
   - Login → Professional Home
   - Wait for token registration
   - Send app to background (home button)

2. **Switch Account (or use different app):**
   - Logout
   - Login as Regular User
   - Submit report

3. **Switch Back:**
   - Logout
   - Login as Professional
   - Check if notification appeared (if app was in background)

**OR**

1. **Use two emulators:**
   - Run app on emulator-5554 (Professional)
   - Run app on emulator-5556 (Regular User)
   - Test between them

---

## 🎯 Expected Behavior

### When Report is Submitted:
```
Console Logs:
✅ Report saved successfully with ID: -OewZuNPl2_G7TenES0k
✅ Found push token for professional: ExponentPushToken[...]
✅ Sending notification with message: {...}
✅ Notification API response: { data: { status: 'ok' } }
✅ Notification sent successfully to professional
```

### When Professional Receives Notification:
```
Console Logs (if app in foreground):
📬 Notification received: {...}
🔔 Notification handler called: {...}
✅ Notification displayed in notification bar
📊 Loading reports for professional UID: [UID]
✅ Report [ID] matches professional - adding to list
🔔 Report [ID] added to alerts (pending)
```

### Visual Result:
- Notification appears in notification bar
- Alert count increases in "Active Alerts" card
- New report card appears in "Incoming Emergency" section
- Report shows patient name, problem type, location

---

## 🔄 Testing Different Scenarios

### Scenario 1: Emergency Priority
- Submit report with "Emergency" pain level
- Notification should have high priority
- Should appear immediately

### Scenario 2: Multiple Reports
- Submit 2-3 reports quickly
- All should appear as separate notifications
- All should show in alerts list

### Scenario 3: Accept Report
- Professional receives notification
- Clicks "Accept" on report
- Report moves from alerts to accepted reports
- Alert count decreases

### Scenario 4: App Closed
- Professional closes app completely
- Submit report
- Notification should still appear
- Tapping opens app and shows report

---

## 📝 Notes

- **Expo Go:** Notifications won't work in Expo Go, must use development build
- **Emulator:** Some emulators may have notification limitations
- **Physical Device:** Best for testing real notification behavior
- **Token Refresh:** Tokens may change, professional needs to login again if token expires

---

## ✅ Success Criteria

Notification feature is working if:
1. ✅ Professional receives notification when report is submitted
2. ✅ Notification appears in notification bar
3. ✅ Tapping notification opens app and shows report
4. ✅ Report appears in alerts/reports list
5. ✅ Alert count updates correctly

---

**Ready to test!** Follow the steps above and check each verification point.

