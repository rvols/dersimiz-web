# Dersimiz - Mobile-First Tutoring Platform

## Executive Summary

**Dersimiz** is a next-generation mobile-first tutoring platform that connects students with qualified tutors through intelligent matching, real-time messaging, and AI-powered safety features. The platform consists of:

1. **Web Application** - Public landing page + Admin panel
2. **Mobile Applications** - Native iOS & Android apps for tutors and students
3. **Backend API Server** - Centralized REST API serving all clients

### Key Differentiators
- **Mobile-First Architecture:** Primary user experience on native mobile apps
- **Phone-Based Authentication:** SMS OTP verification (no passwords)
- **Unified Auth Flow:** Single endpoint for login/register
- **Push Notifications:** Real-time mobile notifications instead of emails
- **Multilingual Support:** Turkish, English (extensible to more languages)
- **AI-Powered Safety:** Content moderation and profile validation

---

## Technology Stack

### Web Platform (Landing + Admin)
- **Framework:** Next.js 14+ (App Router)
- **UI:** React 18+, TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Internationalization:** next-intl
- **Deployment:** Vercel / AWS / Custom server

### Mobile Applications
- **Framework:** React Native with Expo
- **State Management:** Zustand / Redux Toolkit
- **Navigation:** React Navigation 6+
- **Push Notifications:** Firebase Cloud Messaging (FCM) + Apple Push Notification Service (APNS)
- **Real-time:** WebSocket connection to backend
- **Image Handling:** React Native Image Picker + Compression
- **Local Storage:** AsyncStorage / MMKV
- **Deployment:** App Store (iOS) + Google Play (Android)

### Backend Server
- **Runtime:** Node.js 20+ with Express.js
- **Database:** PostgreSQL 15+ (Docker container)
- **Authentication:** JWT tokens with phone number verification
- **SMS Service:** Twilio / Netgsm (Turkish SMS provider)
- **Real-time:** Socket.IO for chat and notifications
- **File Storage:** Local filesystem with NGINX static file serving
- **AI Services:** OpenAI API for content moderation
- **Payment Processing:** Iyzico (Turkish market)
- **Deployment:** Single VPS with Docker Compose

### Infrastructure
- **Reverse Proxy:** NGINX (SSL termination, static files, load balancing)
- **Containerization:** Docker + Docker Compose
- **Caching:** Redis (Docker container)
- **Monitoring:** Sentry (errors) + Uptime monitoring
- **CI/CD:** GitHub Actions with SSH deployment

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Mobile Network                 │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             │                          │
    ┌────────▼────────┐        ┌────────▼────────┐
    │  Web Browser    │        │  Mobile Apps    │
    │  (Landing +     │        │  (iOS/Android)  │
    │   Admin Panel)  │        │  Tutors/Students│
    └────────┬────────┘        └────────┬────────┘
             │                          │
             │        HTTPS/WSS         │
             └──────────┬───────────────┘
                        │
              ┌─────────▼─────────┐
              │    Your VPS       │
              │  (Ubuntu Server)  │
              │                   │
              │  ┌─────────────┐  │
              │  │   NGINX     │  │ ← SSL, Static Files, Reverse Proxy
              │  └──────┬──────┘  │
              │         │         │
              │  ┌──────▼──────┐  │
              │  │  API Server │  │ ← Node.js (Docker)
              │  │  (Express)  │  │
              │  └──────┬──────┘  │
              │         │         │
              │  ┌──────┴──────┬──┴─────┬─────────┐
              │  │             │        │         │
              │  │ PostgreSQL  │ Redis  │  Files  │
              │  │  (Docker)   │(Docker)│ (/data) │
              │  └─────────────┴────────┴─────────┘
              └───────────────────────────────────┘
```

### Component Breakdown

#### 1. Web Application (Public + Admin)
**Purpose:** Landing page for marketing + Admin dashboard for platform management

**Landing Page Features:**
- Multilingual homepage (TR/EN)
- Platform overview and benefits
- Tutor/Student app download links (App Store, Google Play)
- Pricing information
- Contact form
- Blog/Resources section
- SEO-optimized pages

**Admin Panel Features:**
- Accessible only via web (no mobile admin app)
- Secure login (email + password, 2FA recommended)
- Full platform management capabilities
- Analytics dashboards
- User management (approve/reject/ban)
- Content management (lessons, locations, schools)
- Support ticket system
- Financial reports

**Technical Details:**
- Server-Side Rendering (SSR) for SEO
- Static Generation for landing pages
- Protected routes for admin panel
- Responsive design (desktop-optimized for admin)

#### 2. Mobile Applications (iOS + Android)
**Purpose:** Primary interface for tutors and students

**Shared Features:**
- Phone number authentication (SMS OTP)
- Profile management
- Real-time chat with AI moderation
- Push notifications
- In-app payments
- Support system
- Multilingual interface

**Tutor-Specific Features:**
- Dashboard with analytics
- Onboarding wizard
- Lesson type & pricing management
- Availability calendar
- Student list & management
- Subscription management
- Booster purchases
- Earnings tracking

**Student-Specific Features:**
- Dashboard with quick actions
- Onboarding wizard
- Tutor search with filters
- Availability selection
- Favorite tutors
- Chat with tutors
- Demo lesson requests

**Technical Details:**
- Single codebase for iOS & Android (React Native)
- Native modules for platform-specific features
- Offline-first architecture with sync
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Deep linking for notifications
- App-to-app communication

#### 3. Backend API Server
**Purpose:** Centralized business logic and data management

**Core Responsibilities:**
- Authentication & authorization
- User management
- Chat message routing
- AI content moderation
- Push notification dispatch
- Payment processing
- Search & matching algorithms
- Analytics data aggregation
- File upload handling

**API Design:**
- RESTful API for CRUD operations
- WebSocket for real-time chat
- GraphQL endpoint (optional, for complex queries)
- API versioning (/api/v1/)
- Rate limiting per endpoint
- Comprehensive error handling
- Request/response logging

---

## Authentication System

### Phone Number Authentication Flow

**Design Philosophy:**
- No passwords to remember
- No separate login/register flows
- Unified authentication experience
- Secure SMS OTP verification

### Authentication Flow Diagram

```
Mobile App                    Backend API                SMS Service
    │                             │                          │
    │  1. Enter Phone Number      │                          │
    ├──────────────────────────►  │                          │
    │                             │                          │
    │                             │  2. Generate OTP         │
    │                             │  3. Send SMS             │
    │                             ├─────────────────────────►│
    │                             │                          │
    │  4. SMS Delivered           │                          │
    │◄────────────────────────────┼──────────────────────────┤
    │                             │                          │
    │  5. Enter OTP Code          │                          │
    ├──────────────────────────►  │                          │
    │                             │                          │
    │                             │  6. Verify OTP           │
    │                             │  7. Check if user exists │
    │                             │  8a. If new: Create user │
    │                             │  8b. If exists: Login    │
    │                             │  9. Generate JWT token   │
    │                             │                          │
    │  10. Return JWT + User Data │                          │
    │◄─────────────────────────── │                          │
    │                             │                          │
    │  11. Store token locally    │                          │
    │  12. Navigate to app        │                          │
```

### API Endpoint

**POST /api/v1/auth/request-otp**

Request phone verification code.

```json
Request:
{
  "phone_number": "+905551234567",
  "country_code": "TR"
}

Response (Success):
{
  "success": true,
  "message": "Verification code sent",
  "expires_in": 300,
  "retry_after": 60
}

Response (Rate Limited):
{
  "success": false,
  "error": "Too many requests",
  "retry_after": 45
}
```

**POST /api/v1/auth/verify-otp**

Verify OTP and login/register user.

```json
Request:
{
  "phone_number": "+905551234567",
  "otp_code": "123456",
  "device_token": "fcm_token_here", // For push notifications
  "device_info": {
    "platform": "ios",
    "version": "17.0",
    "model": "iPhone 14"
  }
}

Response (New User - Registration):
{
  "success": true,
  "is_new_user": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "phone_number": "+905551234567",
    "role": null, // Not set yet
    "onboarding_completed": false
  },
  "next_step": "role_selection"
}

Response (Existing User - Login):
{
  "success": true,
  "is_new_user": false,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "phone_number": "+905551234567",
    "full_name": "Ahmet Yılmaz",
    "role": "tutor",
    "is_approved": true,
    "onboarding_completed": true,
    "avatar_url": "https://..."
  },
  "next_step": "dashboard"
}

Response (Invalid OTP):
{
  "success": false,
  "error": "Invalid or expired verification code",
  "attempts_remaining": 2
}
```

### Security Measures

1. **OTP Generation:**
   - 6-digit numeric code
   - Cryptographically secure random generation
   - 5-minute expiration
   - Single-use only

2. **Rate Limiting:**
   - Max 3 OTP requests per phone number per hour
   - Max 5 verification attempts per OTP
   - IP-based rate limiting (100 requests/hour)
   - Exponential backoff on failed attempts

3. **Phone Number Validation:**
   - International format validation (E.164)
   - Country code verification
   - Carrier lookup (optional, to detect VOIP)
   - Blacklist check for known spam numbers

4. **JWT Token Management:**
   - Access token: 1-hour expiration
   - Refresh token: 30-day expiration
   - Secure HTTP-only cookies (web)
   - Encrypted storage (mobile)
   - Token rotation on refresh

5. **Device Binding:**
   - Store device fingerprint with token
   - Detect suspicious device changes
   - Require re-authentication on new device

### Biometric Authentication (Mobile)

After initial phone authentication, users can enable biometric login:

1. **Setup:**
   - User enables biometric in app settings
   - Store encrypted refresh token locally
   - Bind to device biometric signature

2. **Login Flow:**
   - User opens app
   - Biometric prompt appears
   - On success, use stored refresh token to get new access token
   - On failure, fallback to phone OTP

---

## Mobile Application Architecture

### App Structure

```
dersimiz-mobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── auth/
│   │   │   ├── PhoneInputScreen.tsx
│   │   │   ├── OTPVerificationScreen.tsx
│   │   │   └── RoleSelectionScreen.tsx
│   │   ├── onboarding/
│   │   │   ├── tutor/    # Tutor onboarding steps
│   │   │   └── student/  # Student onboarding steps
│   │   ├── tutor/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── StudentsScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   └── ...
│   │   └── student/
│   │       ├── DashboardScreen.tsx
│   │       ├── SearchScreen.tsx
│   │       ├── ChatScreen.tsx
│   │       └── ...
│   ├── components/       # Reusable components
│   │   ├── common/
│   │   ├── chat/
│   │   ├── forms/
│   │   └── ...
│   ├── navigation/       # Navigation configuration
│   │   ├── AuthNavigator.tsx
│   │   ├── TutorNavigator.tsx
│   │   ├── StudentNavigator.tsx
│   │   └── RootNavigator.tsx
│   ├── services/         # API and external services
│   │   ├── api/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── notifications/
│   │   └── storage/
│   ├── store/            # State management
│   │   ├── slices/
│   │   └── index.ts
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── constants/        # App constants
│   ├── types/            # TypeScript types
│   ├── i18n/             # Internationalization
│   │   ├── locales/
│   │   │   ├── tr.json
│   │   │   └── en.json
│   │   └── index.ts
│   └── theme/            # Design system
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
├── assets/               # Images, fonts, etc.
├── ios/                  # iOS native code
├── android/              # Android native code
└── app.json              # Expo configuration
```

### Navigation Flow

#### New User Flow
```
Phone Input → OTP Verification → Role Selection → Onboarding (7-8 steps) → Dashboard
```

#### Returning User Flow
```
App Launch → Biometric Auth → Dashboard
```

#### Tutor Navigation Structure
```
Tab Navigator:
├── Dashboard (Home)
├── Students (List)
├── Chat (Conversations)
├── Profile (Settings)
└── More (Menu)
    ├── Subscription
    ├── Boosters
    ├── Earnings
    ├── Support
    └── Settings
```

#### Student Navigation Structure
```
Tab Navigator:
├── Dashboard (Home)
├── Search (Find Tutors)
├── Chat (Conversations)
├── My Tutors (Saved)
└── Profile (Settings)
```

### Key Screens

#### 1. Phone Input Screen
- Country code selector
- Phone number input with formatting
- Terms & privacy policy links
- "Send Code" button
- Language selector

#### 2. OTP Verification Screen
- 6-digit code input
- Auto-fill from SMS (iOS/Android)
- Resend code button (with countdown)
- Edit phone number link
- Auto-verify on code completion

#### 3. Role Selection Screen (New Users Only)
- "I'm a Tutor" card
- "I'm a Student" card
- Brief description of each role
- Cannot skip this step

#### 4. Onboarding Screens
**Tutor Onboarding (8 steps):**
1. Personal Info (name, birth year, gender)
2. Location (country, city, district)
3. Education (school, graduation year)
4. Bio & Introduction
5. Lesson Types & Pricing
6. Availability Calendar
7. Profile Photo Upload
8. Review & Submit

**Student Onboarding (6 steps):**
1. Personal Info (name, birth year, gender)
2. Location (country, city, district)
3. School Info (school type, school, grade)
4. Bio (optional)
5. Lesson Interests
6. Profile Photo Upload
7. Review & Submit

#### 5. Dashboard Screens
**Tutor Dashboard:**
- Welcome header with name
- Performance stats cards (impressions, contacts, completeness)
- Subscription status widget
- Active boosters widget
- Quick actions (manage lessons, set availability)
- Recent student contacts
- Pending approval banner (if not approved)

**Student Dashboard:**
- Welcome header with name
- Quick search CTA
- Stats cards (searches, contacts, favorites)
- Recent activity feed
- Grade widget
- Quick links (messages, my tutors, support)

#### 6. Chat Screen
- Conversation list (left panel on tablet, full screen on phone)
- Chat window with messages
- Message input with send button
- AI moderation indicator
- Profile popup (tap avatar)
- Three-dot menu (share contact, request demo, block)
- Real-time typing indicators
- Read receipts
- Message timestamps

#### 7. Search Screen (Students)
- Search criteria form
  - Lesson type dropdown
  - Weekly lesson count selector
  - Availability grid
- "Find Tutors" button
- Results view
  - Tutor cards with details
  - Booster badges
  - "Request Demo Lesson" button
- Empty state with suggestions

#### 8. Profile Screen
- Avatar with edit button
- Profile completeness bar (tutors)
- Editable fields
- Logout button
- Delete account option
- App version info

---

## Push Notification System

### Notification Types

#### 1. Chat Notifications
**Trigger:** New message received
**Payload:**
```json
{
  "type": "new_message",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "sender_name": "Ahmet Yılmaz",
  "sender_avatar": "https://...",
  "message_preview": "Merhaba, ne zaman...",
  "timestamp": "2026-02-07T10:30:00Z"
}
```
**Action:** Open chat screen with conversation

#### 2. Approval Notifications
**Trigger:** Admin approves/rejects user
**Payload:**
```json
{
  "type": "approval_status",
  "status": "approved", // or "rejected"
  "message": "Profiliniz onaylandı!",
  "rejection_reason": "..." // Only if rejected
}
```
**Action:** Open dashboard or support screen

#### 3. Subscription Notifications
**Trigger:** Subscription expiring soon, renewed, or cancelled
**Payload:**
```json
{
  "type": "subscription_update",
  "event": "expiring_soon", // or "renewed", "cancelled"
  "days_remaining": 3,
  "plan_name": "Premium"
}
```
**Action:** Open subscription screen

#### 4. Booster Notifications
**Trigger:** Booster activated, expiring, or expired
**Payload:**
```json
{
  "type": "booster_update",
  "event": "activated", // or "expiring", "expired"
  "booster_name": "7-Day Search Boost",
  "expires_at": "2026-02-14T10:00:00Z"
}
```
**Action:** Open boosters screen

#### 5. Student Contact Notifications (Tutors)
**Trigger:** New student initiates chat
**Payload:**
```json
{
  "type": "new_student_contact",
  "student_id": "uuid",
  "student_name": "Ayşe Demir",
  "lesson_type": "Matematik",
  "conversation_id": "uuid"
}
```
**Action:** Open chat with student

#### 6. Support Notifications
**Trigger:** Admin replies to support ticket
**Payload:**
```json
{
  "type": "support_reply",
  "ticket_id": "uuid",
  "admin_name": "Support Team",
  "message_preview": "Sorunuz için teşekkürler..."
}
```
**Action:** Open support chat

### Notification Delivery

**Firebase Cloud Messaging (FCM) for Android:**
- Register device token on login
- Send token to backend
- Backend sends notification via FCM API
- App receives notification in foreground/background
- Display notification or update UI

**Apple Push Notification Service (APNS) for iOS:**
- Request notification permission
- Register device token on login
- Send token to backend
- Backend sends notification via APNS
- App receives notification
- Display notification or update UI

**Notification Preferences:**
- Users can enable/disable each notification type
- Quiet hours (no notifications during sleep)
- Notification sound selection
- Vibration on/off

### Backend Notification Service

```typescript
// Pseudo-code for notification service
class NotificationService {
  async sendNotification(userId: string, notification: Notification) {
    // Get user's device tokens
    const devices = await this.getDeviceTokens(userId);
    
    // Get user's notification preferences
    const preferences = await this.getNotificationPreferences(userId);
    
    // Check if notification type is enabled
    if (!preferences[notification.type]) {
      return;
    }
    
    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      await this.queueForLater(userId, notification);
      return;
    }
    
    // Send to all user devices
    for (const device of devices) {
      if (device.platform === 'ios') {
        await this.sendAPNS(device.token, notification);
      } else {
        await this.sendFCM(device.token, notification);
      }
    }
    
    // Store notification in database
    await this.storeNotification(userId, notification);
  }
}
```

---

## Chat System Architecture

### Real-Time Messaging

**Technology:** Socket.IO (WebSocket with fallback)

**Connection Flow:**
```
1. User logs in → Receive JWT token
2. App establishes WebSocket connection with JWT
3. Server authenticates connection
4. User joins personal room (user_id)
5. User joins conversation rooms
6. Messages sent/received via WebSocket
7. On disconnect, auto-reconnect with exponential backoff
```

### Message Flow

```
Sender App          Backend Server          Recipient App
    │                     │                      │
    │  1. Send Message    │                      │
    ├────────────────────►│                      │
    │                     │                      │
    │                     │  2. AI Moderation    │
    │                     │  (Async)             │
    │                     │                      │
    │                     │  3. Save to DB       │
    │                     │                      │
    │  4. Ack (Message ID)│                      │
    │◄────────────────────┤                      │
    │                     │                      │
    │                     │  5. Emit to Recipient│
    │                     ├─────────────────────►│
    │                     │                      │
    │                     │  6. Send Push (if offline)
    │                     │                      │
    │  7. Delivery Receipt│                      │
    │◄────────────────────┼──────────────────────┤
    │                     │                      │
    │                     │  8. Read Receipt     │
    │◄────────────────────┼──────────────────────┤
```

### AI Moderation

**Process:**
1. Message sent to server
2. Server immediately acknowledges receipt
3. Async AI moderation check
4. If approved: Deliver to recipient
5. If blocked: Notify sender, don't deliver
6. If flagged: Deliver but notify admin

**Moderation API:**
```typescript
interface ModerationResult {
  status: 'approved' | 'blocked' | 'flagged';
  categories: {
    hate: number;
    sexual: number;
    violence: number;
    self_harm: number;
    harassment: number;
  };
  flagged_categories: string[];
}
```

**Moderation Rules:**
- Block if any category > 0.8
- Flag if any category > 0.5
- Auto-ban user after 3 blocked messages
- Admin review for flagged messages

### Message Types

1. **Text Message**
```json
{
  "type": "text",
  "content": "Merhaba, ne zaman müsaitsiniz?"
}
```

2. **Contact Share**
```json
{
  "type": "contact_share",
  "phone_number": "+905551234567"
}
```

3. **Demo Lesson Request**
```json
{
  "type": "demo_request",
  "lesson_type_id": "uuid",
  "preferred_times": ["2026-02-10T14:00:00Z", "2026-02-11T16:00:00Z"]
}
```

4. **System Message**
```json
{
  "type": "system",
  "content": "Ahmet Yılmaz joined the conversation",
  "system_type": "user_joined"
}
```

### Offline Message Handling

**Mobile App:**
- Queue messages locally when offline
- Show "sending..." indicator
- Auto-send when connection restored
- Show delivery status (sent, delivered, read)

**Backend:**
- Store undelivered messages
- Send push notification if recipient offline
- Deliver on next connection
- Mark as delivered when received

---

## Database Schema (Improvements from SPEL)

### Core Changes

1. **Remove email field from profiles** (phone number is primary identifier)
2. **Add device_tokens table** for push notifications
3. **Add notification_preferences table**
4. **Add otp_codes table** for verification
5. **Improve indexing** for mobile performance
6. **Add soft deletes** for user accounts

### New/Modified Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'tutor', 'student')),
  full_name TEXT,
  avatar_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;
```

#### otp_codes
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone_number, created_at DESC);
```

#### device_tokens
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_device_tokens_token ON device_tokens(token);
```

#### notification_preferences
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  new_message BOOLEAN DEFAULT true,
  approval_status BOOLEAN DEFAULT true,
  subscription_update BOOLEAN DEFAULT true,
  booster_update BOOLEAN DEFAULT true,
  new_student_contact BOOLEAN DEFAULT true,
  support_reply BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### notifications_log
```sql
CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications_log(user_id, sent_at DESC);
```

### Performance Optimizations

1. **Materialized Views** for dashboard stats
2. **Partial Indexes** for active users only
3. **JSONB Indexes** for multilingual content
4. **Connection Pooling** (PgBouncer)
5. **Read Replicas** for analytics queries
6. **Partitioning** for large tables (messages, logs)

---

## API Architecture

### RESTful API Design

**Base URL:** `https://api.dersimiz.com/v1`

**Authentication:** Bearer token in Authorization header

### Endpoint Categories

#### 1. Authentication
- `POST /auth/request-otp` - Request verification code
- `POST /auth/verify-otp` - Verify code and login/register
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate token

#### 2. User Profile
- `GET /profile` - Get current user profile
- `PUT /profile` - Update profile
- `POST /profile/avatar` - Upload avatar
- `DELETE /profile` - Delete account (soft delete)

#### 3. Onboarding
- `GET /onboarding/status` - Get onboarding progress
- `POST /onboarding/step` - Complete onboarding step
- `GET /onboarding/data` - Get form data (locations, schools, etc.)

#### 4. Tutor Endpoints
- `GET /tutor/dashboard` - Dashboard stats
- `GET /tutor/students` - List connected students
- `GET /tutor/lessons` - Manage lesson types
- `POST /tutor/lessons` - Add lesson type
- `PUT /tutor/lessons/:id` - Update lesson pricing
- `DELETE /tutor/lessons/:id` - Remove lesson type
- `GET /tutor/availability` - Get availability
- `PUT /tutor/availability` - Update availability
- `GET /tutor/subscription` - Get subscription status
- `POST /tutor/subscription` - Subscribe to plan
- `GET /tutor/boosters` - Get boosters
- `POST /tutor/boosters` - Purchase booster

#### 5. Student Endpoints
- `GET /student/dashboard` - Dashboard stats
- `POST /student/search` - Search for tutors
- `GET /student/search/history` - Search history
- `GET /student/tutors` - List connected tutors
- `POST /student/favorites/:tutorId` - Add to favorites
- `DELETE /student/favorites/:tutorId` - Remove from favorites

#### 6. Chat
- `GET /chat/conversations` - List conversations
- `GET /chat/conversations/:id/messages` - Get messages
- `POST /chat/conversations/:id/messages` - Send message
- `POST /chat/conversations/:id/read` - Mark as read
- `POST /chat/conversations/:id/share-contact` - Share phone number
- `POST /chat/conversations/:id/demo-request` - Request demo lesson

#### 7. Support
- `GET /support/conversation` - Get support conversation
- `POST /support/messages` - Send support message
- `PUT /support/conversation/status` - Update ticket status

#### 8. Admin (Web Only)
- `GET /admin/stats` - Platform statistics
- `GET /admin/users` - List users with filters
- `POST /admin/users/:id/approve` - Approve user
- `POST /admin/users/:id/reject` - Reject user
- `POST /admin/users/:id/ban` - Ban user
- `GET /admin/support-tickets` - List support tickets
- `POST /admin/support-tickets/:id/reply` - Reply to ticket
- ... (all other admin endpoints)

### WebSocket Events

**Client → Server:**
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send chat message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `message_read` - Mark message as read

**Server → Client:**
- `message_received` - New message in conversation
- `message_delivered` - Message delivered to recipient
- `message_read` - Message read by recipient
- `user_typing` - Other user is typing
- `user_online` - User came online
- `user_offline` - User went offline
- `conversation_updated` - Conversation metadata changed

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-07T10:30:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone_number",
      "reason": "Must be in E.164 format"
    }
  },
  "meta": {
    "timestamp": "2026-02-07T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Rate Limiting

- **Authentication:** 5 requests/minute per IP
- **Search:** 20 requests/minute per user
- **Chat:** 100 messages/minute per user
- **API General:** 1000 requests/hour per user
- **Admin:** 10000 requests/hour

---

## Internationalization (i18n)

### Supported Languages

**Initial Launch:**
- Turkish (tr)
- English (en)

**Future Expansion:**
- Arabic (ar)
- German (de)
- French (fr)
- Spanish (es)

### Implementation

**Mobile App:**
- Use `react-i18next` or `react-native-localize`
- Store translations in JSON files
- Detect device language on first launch
- Allow manual language selection in settings
- Persist language preference locally

**Web App:**
- Use `next-intl` for Next.js
- URL-based locale routing (/tr/, /en/)
- Automatic detection from browser
- Language switcher in header

**Backend:**
- Store multilingual content in JSONB
- Accept `Accept-Language` header
- Return localized content based on user preference

### Translation Structure

```json
// tr.json
{
  "auth": {
    "phone_input": {
      "title": "Telefon Numaranızı Girin",
      "placeholder": "555 123 4567",
      "button": "Kod Gönder"
    },
    "otp_verification": {
      "title": "Doğrulama Kodu",
      "subtitle": "{{phone}} numarasına gönderilen kodu girin",
      "resend": "Kodu Tekrar Gönder",
      "countdown": "{{seconds}} saniye sonra tekrar gönderebilirsiniz"
    }
  },
  "dashboard": {
    "tutor": {
      "welcome": "Hoş geldin, {{name}}!",
      "stats": {
        "impressions": "Gösterim",
        "contacts": "İletişim",
        "completeness": "Profil Tamlığı"
      }
    }
  }
}
```

### Dynamic Content Translation

**Database Content:**
```sql
-- Lesson types with translations
{
  "tr": "Matematik",
  "en": "Mathematics"
}

-- Subscription plans
{
  "name": {
    "tr": "Premium",
    "en": "Premium"
  },
  "description": {
    "tr": "Profesyonel öğretmenler için gelişmiş özellikler",
    "en": "Advanced features for professional tutors"
  }
}
```

**API Response:**
```json
// Client sends Accept-Language: tr
{
  "lesson_types": [
    {
      "id": "uuid",
      "name": "Matematik", // Localized
      "slug": "matematik"
    }
  ]
}
```

---

## Subscription & Booster Management System

### Overview

Dersimiz uses a **dual monetization model** for tutors:
1. **Subscriptions** - Monthly/yearly plans with different visibility levels
2. **Boosters** - One-time purchases for temporary search ranking boosts

**Payment Method:** Mobile In-App Purchases (IAP) via Apple App Store and Google Play Store.

**Why IAP?**
- ✅ Seamless user experience (no card entry)
- ✅ Built-in subscription management
- ✅ Automatic renewals and cancellations
- ✅ Required for app store compliance
- ❌ 30% platform fee (vs 2-3% for direct payment)

---

## 1. Data Model

### Subscription Plans (subscription_plans table)

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'basic', 'premium', 'pro'
  display_name JSONB NOT NULL, -- { "tr": "Premium", "en": "Premium" }
  description JSONB NOT NULL, -- { "tr": "...", "en": "..." }
  
  -- Pricing (in cents, for reference only; actual prices from App Store/Play Store)
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents INTEGER NOT NULL,
  
  -- IAP Product IDs
  apple_product_id_monthly VARCHAR(100), -- e.g. 'com.dersimiz.premium.monthly'
  apple_product_id_yearly VARCHAR(100),  -- e.g. 'com.dersimiz.premium.yearly'
  google_product_id_monthly VARCHAR(100), -- e.g. 'premium_monthly'
  google_product_id_yearly VARCHAR(100),  -- e.g. 'premium_yearly'
  
  -- Features
  features JSONB NOT NULL, -- ["feature.unlimitedMessages", "feature.prioritySupport"]
  max_students INTEGER, -- null = unlimited
  search_visibility_boost INTEGER DEFAULT 0, -- 0-100 ranking boost
  profile_badge VARCHAR(50), -- 'premium', 'pro', 'verified'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Free plan for new users
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  icon VARCHAR(50), -- 'star', 'crown', 'diamond'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_sort ON subscription_plans(sort_order);
```

### User Subscriptions (user_subscriptions table)

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Subscription period
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP, -- null = ongoing until cancelled
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_renewing BOOLEAN DEFAULT true, -- Will auto-renew
  is_cancelled BOOLEAN DEFAULT false,
  is_trial BOOLEAN DEFAULT false, -- Free trial or default plan
  
  -- Billing
  billing_interval VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  billing_provider VARCHAR(20) NOT NULL, -- 'apple', 'google', 'manual'
  
  -- IAP Integration
  provider_subscription_id VARCHAR(255), -- Apple/Google subscription ID
  provider_transaction_id VARCHAR(255), -- Original transaction ID
  provider_receipt TEXT, -- Encrypted receipt for verification
  
  -- Metadata
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_active ON user_subscriptions(user_id, is_active, end_date);
CREATE INDEX idx_user_subscriptions_provider ON user_subscriptions(provider_subscription_id);
```

### Boosters (boosters table)

```sql
CREATE TABLE boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL, -- e.g. '7day_boost', '30day_boost'
  display_name JSONB NOT NULL, -- { "tr": "7 Günlük Boost", "en": "7-Day Boost" }
  description JSONB NOT NULL,
  
  -- Pricing (in cents, for reference)
  price_cents INTEGER NOT NULL,
  
  -- IAP Product IDs
  apple_product_id VARCHAR(100), -- e.g. 'com.dersimiz.booster.7day'
  google_product_id VARCHAR(100), -- e.g. 'booster_7day'
  
  -- Booster effects
  duration_days INTEGER NOT NULL, -- How long the boost lasts
  search_ranking_boost INTEGER NOT NULL, -- 0-100 ranking boost
  badge_text JSONB, -- { "tr": "🔥 Öne Çıkan", "en": "🔥 Featured" }
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boosters_active ON boosters(is_active);
```

### User Boosters (user_boosters table)

```sql
CREATE TABLE user_boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booster_id UUID NOT NULL REFERENCES boosters(id),
  
  -- Activation period
  activated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- IAP Integration
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_receipt TEXT,
  billing_provider VARCHAR(20) NOT NULL, -- 'apple', 'google'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_boosters_user ON user_boosters(user_id);
CREATE INDEX idx_user_boosters_active ON user_boosters(user_id, is_active, expires_at);
CREATE INDEX idx_user_boosters_provider ON user_boosters(provider_transaction_id);
```

### Transactions (transactions table)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction details
  type VARCHAR(20) NOT NULL, -- 'subscription', 'booster', 'refund'
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  
  -- IAP Integration
  billing_provider VARCHAR(20) NOT NULL, -- 'apple', 'google'
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_receipt TEXT,
  
  -- Related entities
  subscription_id UUID REFERENCES user_subscriptions(id),
  booster_id UUID REFERENCES user_boosters(id),
  
  -- Metadata
  metadata JSONB, -- Full receipt/webhook payload
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_provider ON transactions(provider_transaction_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
```

---

## 2. Plan Management (Admin)

### Admin Plan CRUD

**List Plans:**
```
GET /api/admin/subscription-plans
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "slug": "premium",
        "display_name": { "tr": "Premium", "en": "Premium" },
        "monthly_price_cents": 9900,
        "yearly_price_cents": 99900,
        "apple_product_id_monthly": "com.dersimiz.premium.monthly",
        "google_product_id_monthly": "premium_monthly",
        "features": ["feature.unlimitedMessages", "feature.prioritySupport"],
        "max_students": null,
        "search_visibility_boost": 20,
        "is_active": true,
        "is_default": false,
        "sort_order": 2
      },
      ...
    ]
  }
}
```

**Create Plan:**
```
POST /api/admin/subscription-plans
Authorization: Bearer <admin_token>

Request:
{
  "slug": "pro",
  "display_name": { "tr": "Pro", "en": "Pro" },
  "description": { "tr": "...", "en": "..." },
  "monthly_price_cents": 19900,
  "yearly_price_cents": 199900,
  "apple_product_id_monthly": "com.dersimiz.pro.monthly",
  "apple_product_id_yearly": "com.dersimiz.pro.yearly",
  "google_product_id_monthly": "pro_monthly",
  "google_product_id_yearly": "pro_yearly",
  "features": ["feature.unlimitedMessages", "feature.prioritySupport", "feature.analytics"],
  "max_students": null,
  "search_visibility_boost": 50,
  "profile_badge": "pro",
  "is_active": true,
  "icon": "crown"
}
```

**Update Plan:**
```
PUT /api/admin/subscription-plans/:id
Authorization: Bearer <admin_token>

Request: (same fields as create)
```

### Admin Booster CRUD

**List Boosters:**
```
GET /api/admin/boosters
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "boosters": [
      {
        "id": "uuid",
        "slug": "7day_boost",
        "display_name": { "tr": "7 Günlük Boost", "en": "7-Day Boost" },
        "price_cents": 4900,
        "duration_days": 7,
        "search_ranking_boost": 30,
        "apple_product_id": "com.dersimiz.booster.7day",
        "google_product_id": "booster_7day",
        "is_active": true
      },
      ...
    ]
  }
}
```

**Create/Update Booster:** (Similar structure to plans)

---

## 3. Public API (Mobile Apps)

### Get Available Plans

```
GET /api/subscription-plans
(No authentication required)

Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "slug": "free",
        "display_name": { "tr": "Ücretsiz", "en": "Free" },
        "description": { "tr": "...", "en": "..." },
        "monthly_price_cents": 0,
        "yearly_price_cents": 0,
        "features": ["feature.basicMessages"],
        "max_students": 5,
        "search_visibility_boost": 0,
        "is_default": true,
        "icon": "user"
      },
      {
        "id": "uuid",
        "slug": "premium",
        "display_name": { "tr": "Premium", "en": "Premium" },
        "monthly_price_cents": 9900,
        "yearly_price_cents": 99900,
        "apple_product_id_monthly": "com.dersimiz.premium.monthly",
        "apple_product_id_yearly": "com.dersimiz.premium.yearly",
        "google_product_id_monthly": "premium_monthly",
        "google_product_id_yearly": "premium_yearly",
        "features": ["feature.unlimitedMessages", "feature.prioritySupport"],
        "max_students": null,
        "search_visibility_boost": 20,
        "profile_badge": "premium",
        "icon": "star"
      }
    ]
  }
}
```

### Get Available Boosters

```
GET /api/boosters
(No authentication required)

Response:
{
  "success": true,
  "data": {
    "boosters": [
      {
        "id": "uuid",
        "slug": "7day_boost",
        "display_name": { "tr": "7 Günlük Boost", "en": "7-Day Boost" },
        "description": { "tr": "...", "en": "..." },
        "price_cents": 4900,
        "duration_days": 7,
        "search_ranking_boost": 30,
        "apple_product_id": "com.dersimiz.booster.7day",
        "google_product_id": "booster_7day",
        "badge_text": { "tr": "🔥 Öne Çıkan", "en": "🔥 Featured" },
        "icon": "zap"
      },
      {
        "id": "uuid",
        "slug": "30day_boost",
        "display_name": { "tr": "30 Günlük Boost", "en": "30-Day Boost" },
        "price_cents": 14900,
        "duration_days": 30,
        "search_ranking_boost": 50,
        "apple_product_id": "com.dersimiz.booster.30day",
        "google_product_id": "booster_30day"
      }
    ]
  }
}
```

### Get My Subscription

```
GET /api/me/subscription
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "data": {
    "current_subscription": {
      "id": "uuid",
      "plan": {
        "id": "uuid",
        "slug": "premium",
        "display_name": { "tr": "Premium", "en": "Premium" },
        "features": [...],
        "profile_badge": "premium"
      },
      "start_date": "2026-01-01T00:00:00Z",
      "end_date": "2026-02-01T00:00:00Z",
      "is_active": true,
      "is_renewing": true,
      "is_trial": false,
      "billing_interval": "monthly",
      "billing_provider": "apple"
    },
    "active_boosters": [
      {
        "id": "uuid",
        "booster": {
          "slug": "7day_boost",
          "display_name": { "tr": "7 Günlük Boost", "en": "7-Day Boost" },
          "search_ranking_boost": 30
        },
        "activated_at": "2026-01-15T10:00:00Z",
        "expires_at": "2026-01-22T10:00:00Z",
        "is_active": true
      }
    ]
  }
}
```

### Get My Transactions

```
GET /api/me/transactions
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "subscription",
        "amount_cents": 9900,
        "currency": "USD",
        "status": "completed",
        "billing_provider": "apple",
        "created_at": "2026-01-01T00:00:00Z"
      },
      {
        "id": "uuid",
        "type": "booster",
        "amount_cents": 4900,
        "currency": "USD",
        "status": "completed",
        "billing_provider": "google",
        "created_at": "2026-01-15T10:00:00Z"
      }
    ],
    "total": 2
  }
}
```

---

## 4. Mobile IAP Integration

### iOS (Apple In-App Purchase)

**Setup:**
1. Configure products in App Store Connect
2. Product IDs: `com.dersimiz.{plan_slug}.{interval}` or `com.dersimiz.booster.{slug}`
3. Add IAP capability in Xcode

**Purchase Flow:**

```typescript
// services/iap/apple.ts
import * as RNIap from 'react-native-iap';

const SUBSCRIPTION_SKUS = [
  'com.dersimiz.premium.monthly',
  'com.dersimiz.premium.yearly',
  'com.dersimiz.pro.monthly',
  'com.dersimiz.pro.yearly',
];

const BOOSTER_SKUS = [
  'com.dersimiz.booster.7day',
  'com.dersimiz.booster.30day',
];

export class AppleIAPService {
  async initialize() {
    try {
      await RNIap.initConnection();
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid(); // iOS also benefits
    } catch (error) {
      console.error('IAP initialization failed:', error);
    }
  }

  async getProducts() {
    const subscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
    const boosters = await RNIap.getProducts({ skus: BOOSTER_SKUS });
    
    return { subscriptions, boosters };
  }

  async purchaseSubscription(productId: string) {
    try {
      const purchase = await RNIap.requestSubscription({ sku: productId });
      
      // Verify on backend
      await this.verifyPurchase(purchase);
      
      return purchase;
    } catch (error) {
      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Purchase cancelled');
      }
      throw error;
    }
  }

  async purchaseBooster(productId: string) {
    try {
      const purchase = await RNIap.requestPurchase({ sku: productId });
      
      // Verify on backend
      await this.verifyPurchase(purchase);
      
      return purchase;
    } catch (error) {
      throw error;
    }
  }

  async verifyPurchase(purchase: any) {
    const response = await api.post('/iap/verify', {
      platform: 'apple',
      receipt: purchase.transactionReceipt,
      transaction_id: purchase.transactionId,
      product_id: purchase.productId,
    });

    if (!response.data.success) {
      throw new Error('Purchase verification failed');
    }

    // Finish transaction
    await RNIap.finishTransaction({ purchase });
  }

  async restorePurchases() {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      
      for (const purchase of purchases) {
        await this.verifyPurchase(purchase);
      }
      
      return purchases;
    } catch (error) {
      throw error;
    }
  }

  async cleanup() {
    await RNIap.endConnection();
  }
}
```

### Android (Google Play Billing)

```typescript
// services/iap/google.ts
import * as RNIap from 'react-native-iap';

const SUBSCRIPTION_SKUS = [
  'premium_monthly',
  'premium_yearly',
  'pro_monthly',
  'pro_yearly',
];

const BOOSTER_SKUS = [
  'booster_7day',
  'booster_30day',
];

export class GoogleIAPService {
  async initialize() {
    try {
      await RNIap.initConnection();
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
    } catch (error) {
      console.error('IAP initialization failed:', error);
    }
  }

  async getProducts() {
    const subscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
    const boosters = await RNIap.getProducts({ skus: BOOSTER_SKUS });
    
    return { subscriptions, boosters };
  }

  async purchaseSubscription(productId: string) {
    try {
      const purchase = await RNIap.requestSubscription({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      
      // Verify on backend
      await this.verifyPurchase(purchase);
      
      return purchase;
    } catch (error) {
      throw error;
    }
  }

  async purchaseBooster(productId: string) {
    try {
      const purchase = await RNIap.requestPurchase({
        skus: [productId],
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      
      // Verify on backend
      await this.verifyPurchase(purchase);
      
      return purchase;
    } catch (error) {
      throw error;
    }
  }

  async verifyPurchase(purchase: any) {
    const response = await api.post('/iap/verify', {
      platform: 'google',
      receipt: purchase.purchaseToken,
      transaction_id: purchase.transactionId,
      product_id: purchase.productId,
      package_name: 'com.dersimiz.app',
    });

    if (!response.data.success) {
      throw new Error('Purchase verification failed');
    }

    // Acknowledge purchase
    await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
  }

  async restorePurchases() {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      
      for (const purchase of purchases) {
        await this.verifyPurchase(purchase);
      }
      
      return purchases;
    } catch (error) {
      throw error;
    }
  }

  async cleanup() {
    await RNIap.endConnection();
  }
}
```

### Unified IAP Service

```typescript
// services/iap/index.ts
import { Platform } from 'react-native';
import { AppleIAPService } from './apple';
import { GoogleIAPService } from './google';

class IAPService {
  private service: AppleIAPService | GoogleIAPService;

  constructor() {
    this.service = Platform.OS === 'ios' 
      ? new AppleIAPService() 
      : new GoogleIAPService();
  }

  async initialize() {
    await this.service.initialize();
  }

  async getProducts() {
    return await this.service.getProducts();
  }

  async purchaseSubscription(productId: string) {
    return await this.service.purchaseSubscription(productId);
  }

  async purchaseBooster(productId: string) {
    return await this.service.purchaseBooster(productId);
  }

  async restorePurchases() {
    return await this.service.restorePurchases();
  }

  async cleanup() {
    await this.service.cleanup();
  }
}

export const iapService = new IAPService();
```

---

## 5. Backend Receipt Verification

### Verify IAP Purchase

```
POST /api/iap/verify
Authorization: Bearer <user_token>

Request:
{
  "platform": "apple", // or "google"
  "receipt": "base64_encoded_receipt_or_token",
  "transaction_id": "1000000123456789",
  "product_id": "com.dersimiz.premium.monthly"
}

Backend Logic:
1. Verify receipt with Apple/Google servers
2. Check if transaction already processed (idempotency)
3. Determine if subscription or booster
4. Create/update subscription or activate booster
5. Create transaction record
6. Return success

Response:
{
  "success": true,
  "data": {
    "verified": true,
    "subscription": { ... } // or "booster": { ... }
  }
}
```

**Apple Receipt Verification:**
```typescript
// lib/iap/apple.ts
import axios from 'axios';

const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

export async function verifyAppleReceipt(receipt: string, isProduction: boolean = true) {
  const url = isProduction ? APPLE_VERIFY_URL_PRODUCTION : APPLE_VERIFY_URL_SANDBOX;
  
  const response = await axios.post(url, {
    'receipt-data': receipt,
    'password': process.env.APPLE_SHARED_SECRET, // From App Store Connect
    'exclude-old-transactions': true,
  });

  const { status, receipt: receiptData, latest_receipt_info } = response.data;

  // Status 21007 = sandbox receipt sent to production, retry with sandbox
  if (status === 21007) {
    return verifyAppleReceipt(receipt, false);
  }

  if (status !== 0) {
    throw new Error(`Apple receipt verification failed: ${status}`);
  }

  return {
    verified: true,
    receipt: receiptData,
    latestReceiptInfo: latest_receipt_info,
  };
}
```

**Google Receipt Verification:**
```typescript
// lib/iap/google.ts
import { google } from 'googleapis';

const androidPublisher = google.androidpublisher('v3');

export async function verifyGooglePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string,
  isSubscription: boolean
) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const authClient = await auth.getClient();

  if (isSubscription) {
    const response = await androidPublisher.purchases.subscriptions.get({
      auth: authClient,
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    return {
      verified: true,
      data: response.data,
    };
  } else {
    const response = await androidPublisher.purchases.products.get({
      auth: authClient,
      packageName,
      productId,
      token: purchaseToken,
    });

    return {
      verified: true,
      data: response.data,
    };
  }
}
```

---

## 6. Subscription Management Logic

### New User Registration

```typescript
// On POST /api/auth/verify-otp (new user)
async function handleNewUserRegistration(user: User) {
  // Find default free plan
  const freePlan = await db.subscription_plans.findFirst({
    where: { is_default: true, is_active: true }
  });

  if (freePlan) {
    // Create default subscription
    await db.user_subscriptions.create({
      data: {
        user_id: user.id,
        plan_id: freePlan.id,
        start_date: new Date(),
        end_date: null, // Ongoing
        is_active: true,
        is_renewing: false,
        is_cancelled: false,
        is_trial: true,
        billing_interval: 'monthly',
        billing_provider: 'manual',
      }
    });
  }
}
```

### Get User's Current Plan

```typescript
// lib/subscription.ts
export async function getUserCurrentPlan(userId: string) {
  const subscription = await db.user_subscriptions.findFirst({
    where: {
      user_id: userId,
      is_active: true,
      is_cancelled: false,
      OR: [
        { end_date: null },
        { end_date: { gte: new Date() } }
      ]
    },
    include: {
      plan: true
    },
    orderBy: {
      start_date: 'desc'
    }
  });

  return subscription;
}

export async function getUserActiveBoosters(userId: string) {
  const boosters = await db.user_boosters.findMany({
    where: {
      user_id: userId,
      is_active: true,
      expires_at: { gte: new Date() }
    },
    include: {
      booster: true
    },
    orderBy: {
      expires_at: 'desc'
    }
  });

  return boosters;
}
```

### Process Verified Purchase

```typescript
// POST /api/iap/verify
async function processVerifiedPurchase(req, res) {
  const { platform, receipt, transaction_id, product_id } = req.body;
  const userId = req.user.id;

  // Check if already processed (idempotency)
  const existing = await db.transactions.findFirst({
    where: { provider_transaction_id: transaction_id }
  });

  if (existing) {
    return res.json({ success: true, data: { verified: true, already_processed: true } });
  }

  // Verify receipt
  let verificationResult;
  if (platform === 'apple') {
    verificationResult = await verifyAppleReceipt(receipt);
  } else {
    const isSubscription = product_id.includes('monthly') || product_id.includes('yearly');
    verificationResult = await verifyGooglePurchase('com.dersimiz.app', product_id, receipt, isSubscription);
  }

  if (!verificationResult.verified) {
    return res.status(400).json({ error: 'Receipt verification failed' });
  }

  // Determine if subscription or booster
  const plan = await db.subscription_plans.findFirst({
    where: {
      OR: [
        { apple_product_id_monthly: product_id },
        { apple_product_id_yearly: product_id },
        { google_product_id_monthly: product_id },
        { google_product_id_yearly: product_id },
      ]
    }
  });

  const booster = await db.boosters.findFirst({
    where: {
      OR: [
        { apple_product_id: product_id },
        { google_product_id: product_id },
      ]
    }
  });

  if (plan) {
    // Create subscription
    const billing_interval = product_id.includes('yearly') ? 'yearly' : 'monthly';
    const end_date = new Date();
    end_date.setMonth(end_date.getMonth() + (billing_interval === 'yearly' ? 12 : 1));

    const subscription = await db.user_subscriptions.create({
      data: {
        user_id: userId,
        plan_id: plan.id,
        start_date: new Date(),
        end_date,
        is_active: true,
        is_renewing: true,
        is_cancelled: false,
        is_trial: false,
        billing_interval,
        billing_provider: platform,
        provider_subscription_id: transaction_id,
        provider_transaction_id: transaction_id,
        provider_receipt: receipt,
      }
    });

    // Create transaction
    await db.transactions.create({
      data: {
        user_id: userId,
        type: 'subscription',
        amount_cents: billing_interval === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents,
        currency: 'USD',
        status: 'completed',
        billing_provider: platform,
        provider_transaction_id: transaction_id,
        provider_receipt: receipt,
        subscription_id: subscription.id,
        metadata: verificationResult,
      }
    });

    return res.json({ success: true, data: { verified: true, subscription } });
  }

  if (booster) {
    // Activate booster
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + booster.duration_days);

    const userBooster = await db.user_boosters.create({
      data: {
        user_id: userId,
        booster_id: booster.id,
        activated_at: new Date(),
        expires_at,
        is_active: true,
        provider_transaction_id: transaction_id,
        provider_receipt: receipt,
        billing_provider: platform,
      }
    });

    // Create transaction
    await db.transactions.create({
      data: {
        user_id: userId,
        type: 'booster',
        amount_cents: booster.price_cents,
        currency: 'USD',
        status: 'completed',
        billing_provider: platform,
        provider_transaction_id: transaction_id,
        provider_receipt: receipt,
        booster_id: userBooster.id,
        metadata: verificationResult,
      }
    });

    return res.json({ success: true, data: { verified: true, booster: userBooster } });
  }

  return res.status(400).json({ error: 'Product not found' });
}
```

---

## 7. Search Ranking with Boosters

### Calculate Tutor Search Score

```typescript
// lib/search.ts
export async function calculateTutorSearchScore(tutor: Tutor) {
  let baseScore = 100;

  // Subscription boost
  const subscription = await getUserCurrentPlan(tutor.id);
  if (subscription?.plan) {
    baseScore += subscription.plan.search_visibility_boost || 0;
  }

  // Active booster boost
  const boosters = await getUserActiveBoosters(tutor.id);
  const maxBoosterBoost = Math.max(...boosters.map(b => b.booster.search_ranking_boost), 0);
  baseScore += maxBoosterBoost;

  // Profile completeness
  const completeness = calculateProfileCompleteness(tutor);
  baseScore += completeness * 0.5; // 0-50 points

  // Reviews/ratings (if implemented)
  // baseScore += tutor.average_rating * 10;

  return baseScore;
}
```

---

## 8. Admin Subscription & Transaction Management

### View All Subscriptions

```
GET /api/admin/subscriptions?status=active&page=1&limit=50
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "full_name": "Ahmet Yılmaz",
          "email": "ahmet@example.com",
          "phone_number": "+905551234567"
        },
        "plan": {
          "slug": "premium",
          "display_name": { "tr": "Premium", "en": "Premium" }
        },
        "start_date": "2026-01-01T00:00:00Z",
        "end_date": "2026-02-01T00:00:00Z",
        "is_active": true,
        "is_renewing": true,
        "billing_interval": "monthly",
        "billing_provider": "apple"
      },
      ...
    ],
    "pagination": {
      "total": 523,
      "page": 1,
      "limit": 50,
      "pages": 11
    }
  }
}
```

### View All Transactions

```
GET /api/admin/transactions?type=subscription&status=completed&page=1&limit=50
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "full_name": "Ahmet Yılmaz",
          "email": "ahmet@example.com"
        },
        "type": "subscription",
        "amount_cents": 9900,
        "currency": "USD",
        "status": "completed",
        "billing_provider": "apple",
        "provider_transaction_id": "1000000123456789",
        "created_at": "2026-01-01T00:00:00Z"
      },
      ...
    ],
    "pagination": { ... }
  }
}
```

---

## 9. Mobile App UI Implementation

### Subscription Screen

```typescript
// screens/tutor/SubscriptionScreen.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { iapService } from '@/services/iap';
import { api } from '@/services/api';

export const SubscriptionScreen = () => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [plansRes, subRes] = await Promise.all([
      api.get('/subscription-plans'),
      api.get('/me/subscription'),
    ]);

    setPlans(plansRes.data.plans);
    setCurrentSubscription(subRes.data.current_subscription);
  };

  const handlePurchase = async (plan, interval: 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const productId = Platform.OS === 'ios'
        ? (interval === 'monthly' ? plan.apple_product_id_monthly : plan.apple_product_id_yearly)
        : (interval === 'monthly' ? plan.google_product_id_monthly : plan.google_product_id_yearly);

      await iapService.purchaseSubscription(productId);
      
      // Reload subscription
      await loadData();
      
      Alert.alert('Success', 'Subscription activated!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await iapService.restorePurchases();
      await loadData();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'No purchases to restore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription Plans</Text>

      {currentSubscription && (
        <View style={styles.currentPlan}>
          <Text>Current Plan: {currentSubscription.plan.display_name.en}</Text>
          <Text>Renews: {new Date(currentSubscription.end_date).toLocaleDateString()}</Text>
        </View>
      )}

      {plans.map(plan => (
        <View key={plan.id} style={styles.planCard}>
          <Text style={styles.planName}>{plan.display_name.en}</Text>
          <Text style={styles.planDescription}>{plan.description.en}</Text>
          
          <View style={styles.features}>
            {plan.features.map(feature => (
              <Text key={feature}>✓ {feature}</Text>
            ))}
          </View>

          <View style={styles.pricing}>
            <TouchableOpacity
              style={styles.priceButton}
              onPress={() => handlePurchase(plan, 'monthly')}
              disabled={loading}
            >
              <Text>${(plan.monthly_price_cents / 100).toFixed(2)}/month</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.priceButton}
              onPress={() => handlePurchase(plan, 'yearly')}
              disabled={loading}
            >
              <Text>${(plan.yearly_price_cents / 100).toFixed(2)}/year</Text>
              <Text style={styles.savings}>Save 20%</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text>Restore Purchases</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

### Booster Screen

```typescript
// screens/tutor/BoostersScreen.tsx
export const BoostersScreen = () => {
  const [boosters, setBoosters] = useState([]);
  const [activeBoosters, setActiveBoosters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [boostersRes, subRes] = await Promise.all([
      api.get('/boosters'),
      api.get('/me/subscription'),
    ]);

    setBoosters(boostersRes.data.boosters);
    setActiveBoosters(subRes.data.active_boosters || []);
  };

  const handlePurchase = async (booster) => {
    setLoading(true);
    try {
      const productId = Platform.OS === 'ios'
        ? booster.apple_product_id
        : booster.google_product_id;

      await iapService.purchaseBooster(productId);
      
      await loadData();
      
      Alert.alert('Success', 'Booster activated!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Search Boosters</Text>

      {activeBoosters.length > 0 && (
        <View style={styles.activeSection}>
          <Text style={styles.sectionTitle}>Active Boosters</Text>
          {activeBoosters.map(ab => (
            <View key={ab.id} style={styles.activeBooster}>
              <Text>{ab.booster.display_name.en}</Text>
              <Text>Expires: {new Date(ab.expires_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Available Boosters</Text>
      {boosters.map(booster => (
        <View key={booster.id} style={styles.boosterCard}>
          <Text style={styles.boosterName}>{booster.display_name.en}</Text>
          <Text style={styles.boosterDescription}>{booster.description.en}</Text>
          <Text style={styles.boosterDuration}>{booster.duration_days} days</Text>
          <Text style={styles.boosterBoost}>+{booster.search_ranking_boost} ranking boost</Text>
          
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => handlePurchase(booster)}
            disabled={loading}
          >
            <Text>${(booster.price_cents / 100).toFixed(2)}</Text>
            <Text>Activate Booster</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};
```

---

## 10. Key Features Summary

1. **Dual Monetization:** Subscriptions (recurring) + Boosters (one-time)
2. **Mobile IAP:** Native Apple/Google payment integration
3. **Receipt Verification:** Server-side validation for security
4. **Default Free Plan:** All new users start with free tier
5. **Search Ranking:** Dynamic scoring based on subscription + active boosters
6. **Transaction History:** Complete audit trail of all purchases
7. **Admin Management:** Full CRUD for plans, boosters, and monitoring
8. **Restore Purchases:** Users can restore on new devices
9. **Idempotency:** Duplicate transactions prevented
10. **Multi-language:** All plan/booster names and descriptions support i18n

---

## Admin Panel Features (Web Only)

### Access Control

**Authentication:**
- Email + password login
- Two-factor authentication (2FA) recommended
- Session timeout after 30 minutes of inactivity
- IP whitelist (optional)

**No Mobile Access:**
- Admin panel only accessible via web browser
- Responsive design for desktop/tablet
- No admin features in mobile app

### Dashboard

**Key Metrics:**
- Total users (tutors, students)
- Active users (last 30 days)
- Revenue (subscriptions + boosters)
- Growth trends (MoM, YoY)
- Conversion rates (registration → approval → active)

**Charts:**
- User growth over time
- Revenue trends
- Popular lesson types
- Geographic distribution
- Platform usage (iOS vs Android)

### User Management

**Features:**
- Advanced filtering (role, status, date, location)
- Bulk actions (approve, reject, export)
- User detail view
- Profile editing
- Approval workflow
- Ban management
- Activity logs

**Approval Process:**
1. Admin reviews new user profile
2. Check AI validation results
3. Verify profile photo
4. Approve or reject with reason
5. System sends push notification to user
6. If rejected, create support ticket

### Content Management

**Lesson Types:**
- Add/edit/delete lesson types
- Set price ranges
- Manage translations
- View tutor count per lesson

**Locations:**
- Manage countries, cities, districts
- Hierarchical navigation
- Bulk import from CSV
- Usage statistics

**Schools:**
- Manage school types, schools, grades
- Add new schools
- Merge duplicates
- Link to locations

### Financial Management

**Subscriptions:**
- View all active subscriptions
- Subscription history
- Revenue reports
- Refund management
- Plan analytics

**Boosters:**
- Active boosters list
- Purchase history
- Effectiveness metrics
- Revenue tracking

**Transactions:**
- All payment transactions
- Filter by type, status, date
- Export to CSV/Excel
- Reconciliation tools

### Support System

**Ticket Management:**
- List all support conversations
- Filter by status, user role
- Reply to tickets
- Escalate to senior support
- Close/reopen tickets
- Canned responses

**Auto-Generated Tickets:**
- User rejections
- Payment failures
- System errors
- AI moderation flags

### Analytics & Reports

**User Analytics:**
- User acquisition sources
- Retention rates
- Churn analysis
- Cohort analysis

**Business Analytics:**
- Revenue breakdown
- Subscription conversion rates
- Booster effectiveness
- Popular lesson types
- Peak usage times

**Platform Health:**
- API response times
- Error rates
- Database performance
- Mobile app crash reports

### Settings

**Platform Configuration:**
- Platform name and branding
- Default language
- Feature toggles
- Maintenance mode

**AI Moderation:**
- Moderation thresholds
- Auto-ban rules
- Flagged content review

**Notifications:**
- Push notification templates
- SMS templates
- Notification settings

**Payment:**
- Payment provider settings
- Pricing configuration
- Tax settings

### Legal Documents Management

**Purpose:** Manage Terms & Conditions, Privacy Policy, Cookie Policy, and Acceptable Usage Policy with versioning and user acceptance tracking.

**Features:**
- Create new versions of legal documents
- Track which users accepted which version
- Force users to accept latest versions
- View acceptance history with IP addresses
- Public read-only legal pages

**Document Types:**
1. Terms & Conditions
2. Privacy Notice
3. Cookie Policy
4. Acceptable Usage Policy

**Admin Workflow:**
1. Navigate to `/admin/legal`
2. View latest version of each document type
3. Create new version (type, title, Markdown content)
4. Publish immediately (no draft state)
5. View acceptance history per version

**User Workflow:**
1. Login/Register → Check if latest versions accepted
2. If not accepted → Redirect to `/agreements`
3. View all required documents (unaccepted latest versions)
4. Click "Accept All and Continue"
5. Acceptance recorded with timestamp and IP
6. Redirect to dashboard/onboarding

**Public Access:**
- `/legal` page shows latest version of all documents
- No login required
- Read-only (no acceptance)

---

## Legal Documents System (Detailed)

### Database Schema

**legal_documents table:**
```sql
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy')),
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  body_markdown TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(type, version)
);

CREATE INDEX idx_legal_documents_type_version ON legal_documents(type, version DESC);
```

**user_agreements table:**
```sql
CREATE TABLE user_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id),
  accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45) NOT NULL,
  
  UNIQUE(user_id, legal_document_id)
);

CREATE INDEX idx_user_agreements_user ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_document ON user_agreements(legal_document_id);
```

**users table addition:**
```sql
ALTER TABLE users ADD COLUMN accepted_agreement_version_ids JSONB DEFAULT '[]';
-- Stores: [{ "id": "uuid", "type": "terms_and_conditions" }, ...]
-- This is a denormalized cache; source of truth is user_agreements table
```

### API Endpoints

#### Admin Endpoints

**1. List All Legal Documents**
```
GET /api/admin/legal
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "terms_and_conditions": {
      "latest": {
        "id": "uuid",
        "version": 3,
        "title": "Terms and Conditions",
        "published_at": "2026-02-01T10:00:00Z",
        "created_by": {
          "id": "uuid",
          "name": "Admin User"
        }
      },
      "all_versions": [
        { "id": "uuid", "version": 3, "title": "...", "published_at": "..." },
        { "id": "uuid", "version": 2, "title": "...", "published_at": "..." },
        { "id": "uuid", "version": 1, "title": "...", "published_at": "..." }
      ]
    },
    "privacy_notice": { ... },
    "cookie_policy": { ... },
    "acceptable_usage_policy": { ... }
  }
}
```

**2. Create New Version**
```
POST /api/admin/legal
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "type": "terms_and_conditions",
  "title": "Terms and Conditions v4",
  "body_markdown": "# Terms and Conditions\n\n## 1. Introduction\n..."
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "terms_and_conditions",
    "version": 4,
    "title": "Terms and Conditions v4",
    "published_at": "2026-02-07T12:00:00Z"
  }
}

Errors:
- 400: Invalid type
- 400: Missing title or body_markdown
- 403: Not admin
```

**3. View Document and Acceptances**
```
GET /api/admin/legal/:id
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "document": {
      "id": "uuid",
      "type": "terms_and_conditions",
      "version": 3,
      "title": "Terms and Conditions",
      "body_markdown": "# Terms...",
      "published_at": "2026-02-01T10:00:00Z",
      "created_by": {
        "id": "uuid",
        "name": "Admin User",
        "email": "admin@dersimiz.com"
      }
    },
    "acceptances": [
      {
        "user": {
          "id": "uuid",
          "full_name": "Ahmet Yılmaz",
          "email": "ahmet@example.com",
          "role": "tutor"
        },
        "accepted_at": "2026-02-02T14:30:00Z",
        "ip_address": "192.168.1.1"
      },
      ...
    ],
    "total_acceptances": 1523
  }
}
```

#### User Endpoints

**4. Get Required Documents**
```
GET /api/legal/required
Authorization: Bearer <user_token>

Response (has required docs):
{
  "success": true,
  "data": {
    "required_documents": [
      {
        "id": "uuid",
        "type": "terms_and_conditions",
        "version": 4,
        "title": "Terms and Conditions",
        "body_markdown": "# Terms..."
      },
      {
        "id": "uuid",
        "type": "privacy_notice",
        "version": 2,
        "title": "Privacy Notice",
        "body_markdown": "# Privacy..."
      }
    ]
  }
}

Response (all accepted):
{
  "success": true,
  "data": {
    "required_documents": []
  }
}
```

**5. Accept Documents**
```
POST /api/legal/accept
Authorization: Bearer <user_token>
Content-Type: application/json

Request:
{
  "document_ids": ["uuid1", "uuid2", "uuid3", "uuid4"]
}

Response:
{
  "success": true,
  "data": {
    "accepted_count": 4,
    "accepted_documents": [
      {
        "id": "uuid1",
        "type": "terms_and_conditions",
        "version": 4
      },
      ...
    ]
  }
}

Errors:
- 400: Missing document_ids
- 400: Invalid document ID
- 409: Already accepted (idempotent, returns success)
```

**6. Get Public Legal Documents**
```
GET /api/legal/public
(No authentication required)

Response:
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "type": "acceptable_usage_policy",
        "version": 1,
        "title": "Acceptable Usage Policy",
        "body_markdown": "# AUP..."
      },
      {
        "id": "uuid",
        "type": "cookie_policy",
        "version": 2,
        "title": "Cookie Policy",
        "body_markdown": "# Cookies..."
      },
      {
        "id": "uuid",
        "type": "privacy_notice",
        "version": 3,
        "title": "Privacy Notice",
        "body_markdown": "# Privacy..."
      },
      {
        "id": "uuid",
        "type": "terms_and_conditions",
        "version": 4,
        "title": "Terms and Conditions",
        "body_markdown": "# Terms..."
      }
    ]
  }
}
```

### Authentication Flow Integration

**Modified Login Response:**
```typescript
POST /api/auth/verify-otp

// After OTP verification, check legal acceptance
const latestDocs = await getLatestDocumentsPerType();
const userAcceptances = await getUserAcceptances(user.id);
const acceptedDocIds = new Set(userAcceptances.map(a => a.legal_document_id));

const requiresLegalAccept = latestDocs.some(doc => !acceptedDocIds.has(doc.id));

return {
  success: true,
  is_new_user: false,
  access_token: "...",
  refresh_token: "...",
  user: { ... },
  requires_legal_accept: requiresLegalAccept, // NEW FIELD
  next_step: requiresLegalAccept ? "legal_agreements" : "dashboard"
};
```

**Modified Register Response:**
```typescript
POST /api/auth/verify-otp (new user)

// After creating user, check if there are any legal documents
const latestDocs = await getLatestDocumentsPerType();
const requiresLegalAccept = latestDocs.length > 0;

return {
  success: true,
  is_new_user: true,
  access_token: "...",
  refresh_token: "...",
  user: { ... },
  requires_legal_accept: requiresLegalAccept, // NEW FIELD
  next_step: requiresLegalAccept ? "legal_agreements" : "role_selection"
};
```

### Mobile App Implementation

**App Navigation Flow:**
```typescript
// After login/register
if (response.requires_legal_accept) {
  navigation.replace('LegalAgreements');
} else if (response.is_new_user) {
  navigation.replace('RoleSelection');
} else if (!response.user.onboarding_completed) {
  navigation.replace('Onboarding');
} else {
  navigation.replace('Dashboard');
}
```

**LegalAgreementsScreen.tsx:**
```typescript
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, Button } from 'react-native';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';

export const LegalAgreementsScreen = ({ navigation }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequiredDocuments();
  }, []);

  const loadRequiredDocuments = async () => {
    try {
      const response = await api.get('/legal/required');
      
      if (response.data.required_documents.length === 0) {
        // Nothing to accept, redirect
        redirectAfterAccept();
        return;
      }
      
      setDocuments(response.data.required_documents);
    } catch (error) {
      if (error.response?.status === 401) {
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    try {
      const documentIds = documents.map(doc => doc.id);
      await api.post('/legal/accept', { document_ids: documentIds });
      
      redirectAfterAccept();
    } catch (error) {
      alert('Failed to accept documents. Please try again.');
    }
  };

  const redirectAfterAccept = () => {
    // Determine where to go next based on user state
    const user = getUserFromStore();
    
    if (user.role === 'admin') {
      navigation.replace('AdminDashboard');
    } else if (!user.onboarding_completed) {
      navigation.replace('Onboarding');
    } else {
      navigation.replace('Dashboard');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (documents.length === 0) {
    return <Text>Redirecting...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Legal Agreements</Text>
      <Text style={styles.subtitle}>
        Please review and accept the following documents to continue
      </Text>

      {documents.map(doc => (
        <View key={doc.id} style={styles.documentCard}>
          <Text style={styles.documentType}>
            {formatDocumentType(doc.type)}
          </Text>
          <Text style={styles.documentVersion}>Version {doc.version}</Text>
          <ReactMarkdown>{doc.body_markdown}</ReactMarkdown>
        </View>
      ))}

      <Button
        title="Accept All and Continue"
        onPress={handleAcceptAll}
      />
    </ScrollView>
  );
};
```

**Onboarding Screen Check:**
```typescript
// OnboardingScreen.tsx
useEffect(() => {
  checkLegalRequirements();
}, []);

const checkLegalRequirements = async () => {
  const response = await api.get('/legal/required');
  
  if (response.data.required_documents.length > 0) {
    // User has pending legal documents, redirect
    navigation.replace('LegalAgreements');
  }
};
```

### Web App Implementation

**Admin Legal Documents Page (`/admin/legal`):**
```typescript
// pages/admin/legal/index.tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AdminLegalPage() {
  const [documents, setDocuments] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const response = await api.get('/admin/legal');
    setDocuments(response.data);
  };

  return (
    <div className="admin-legal">
      <h1>Legal Documents</h1>
      
      <button onClick={() => setShowCreateModal(true)}>
        Create New Version
      </button>

      <div className="document-cards">
        {Object.entries(documents).map(([type, data]) => (
          <DocumentCard
            key={type}
            type={type}
            latest={data.latest}
            allVersions={data.all_versions}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadDocuments}
        />
      )}
    </div>
  );
}
```

**Public Legal Page (`/legal`):**
```typescript
// pages/legal/index.tsx
import { GetStaticProps } from 'next';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';

export default function PublicLegalPage({ documents }) {
  return (
    <div className="legal-page">
      <h1>Legal Documents</h1>
      
      {documents.map(doc => (
        <section key={doc.id} id={doc.type}>
          <h2>{doc.title}</h2>
          <p className="version">Version {doc.version}</p>
          <ReactMarkdown>{doc.body_markdown}</ReactMarkdown>
        </section>
      ))}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const response = await api.get('/legal/public');
  
  return {
    props: {
      documents: response.data.documents
    },
    revalidate: 3600 // Revalidate every hour
  };
};
```

### Backend Implementation Example

**Create New Version:**
```typescript
// POST /api/admin/legal
async function createLegalDocument(req, res) {
  const { type, title, body_markdown } = req.body;
  const adminId = req.user.id;

  // Validate type
  const validTypes = ['terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  // Get current max version for this type
  const maxVersionResult = await db.query(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM legal_documents WHERE type = $1',
    [type]
  );
  const nextVersion = maxVersionResult.rows[0].max_version + 1;

  // Insert new document
  const result = await db.query(
    `INSERT INTO legal_documents (type, version, title, body_markdown, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [type, nextVersion, title, body_markdown, adminId]
  );

  return res.json({
    success: true,
    data: result.rows[0]
  });
}
```

**Accept Documents:**
```typescript
// POST /api/legal/accept
async function acceptDocuments(req, res) {
  const { document_ids } = req.body;
  const userId = req.user.id;
  const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || 'unknown';

  // Insert acceptances (ON CONFLICT DO NOTHING for idempotency)
  for (const docId of document_ids) {
    await db.query(
      `INSERT INTO user_agreements (user_id, legal_document_id, ip_address)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, legal_document_id) DO NOTHING`,
      [userId, docId, ipAddress]
    );
  }

  // Update user's accepted_agreement_version_ids cache
  const acceptances = await db.query(
    `SELECT ua.legal_document_id as id, ld.type
     FROM user_agreements ua
     JOIN legal_documents ld ON ua.legal_document_id = ld.id
     WHERE ua.user_id = $1`,
    [userId]
  );

  const acceptedVersionIds = acceptances.rows.map(row => ({
    id: row.id,
    type: row.type
  }));

  await db.query(
    'UPDATE users SET accepted_agreement_version_ids = $1 WHERE id = $2',
    [JSON.stringify(acceptedVersionIds), userId]
  );

  return res.json({
    success: true,
    data: {
      accepted_count: document_ids.length,
      accepted_documents: acceptedVersionIds.filter(a => document_ids.includes(a.id))
    }
  });
}
```

### Key Features Summary

1. **Versioning:** Each document type has independent version numbers (1, 2, 3...)
2. **Acceptance Tracking:** Every acceptance is logged with user, document version, timestamp, and IP
3. **Forced Acceptance:** Users cannot proceed without accepting latest versions
4. **Admin Control:** Admins create new versions and view acceptance history
5. **Public Access:** Read-only public page for transparency
6. **No Edits:** Once published, versions are immutable (create new version instead)
7. **Audit Trail:** Complete history of who accepted what, when, and from where

---

## Deployment Architecture

### Single VPS Docker Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Users                      │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
    ┌────────▼────────┐          ┌────────▼────────┐
    │  Web Browser    │          │  Mobile Apps    │
    │  (Landing +     │          │  (iOS/Android)  │
    │   Admin Panel)  │          │  Tutors/Students│
    └────────┬────────┘          └────────┬────────┘
             │                            │
             │        HTTPS/WSS           │
             └──────────┬─────────────────┘
                        │
        ┌───────────────▼────────────────┐
        │         Your VPS Server         │
        │    (Ubuntu 22.04 / Debian 12)   │
        │                                 │
        │  ┌──────────────────────────┐   │
        │  │   NGINX (Host)           │   │
        │  │  - SSL (Let's Encrypt)   │   │
        │  │  - Reverse Proxy         │   │
        │  │  - Static File Server    │   │
        │  └────────┬─────────────────┘   │
        │           │                     │
        │  ┌────────▼─────────────────┐   │
        │  │   Docker Compose Stack   │   │
        │  │                          │   │
        │  │  ┌────────────────────┐  │   │
        │  │  │  API Container     │  │   │
        │  │  │  (Node.js/Express) │  │   │
        │  │  │  Port: 3000        │  │   │
        │  │  └─────────┬──────────┘  │   │
        │  │            │             │   │
        │  │  ┌─────────┴──────┬──────┴─┐ │
        │  │  │                │        │ │
        │  │  │  PostgreSQL    │ Redis  │ │
        │  │  │  Container     │ Cont.  │ │
        │  │  │  Port: 5432    │ 6379   │ │
        │  │  └────────────────┴────────┘ │
        │  └──────────────────────────────┘
        │                                 │
        │  ┌──────────────────────────┐   │
        │  │  Persistent Volumes      │   │
        │  │  /var/dersimiz/          │   │
        │  │  ├── postgres_data/      │   │
        │  │  ├── redis_data/         │   │
        │  │  └── uploads/            │   │
        │  │      ├── avatars/        │   │
        │  │      └── assets/         │   │
        │  └──────────────────────────┘   │
        └─────────────────────────────────┘
```

### Infrastructure Components

**VPS Server:**
- **Provider:** DigitalOcean / Hetzner / Contabo / OVH
- **Recommended Specs:** 4 vCPU, 8GB RAM, 160GB SSD
- **OS:** Ubuntu 22.04 LTS or Debian 12
- **Cost:** ~$20-40/month

**NGINX (Host Level):**
- **Purpose:** Reverse proxy, SSL termination, static file serving
- **SSL:** Let's Encrypt (free, auto-renewal)
- **Configuration:**
  - Proxy `/api/*` to API container (port 3000)
  - Serve `/uploads/*` directly from filesystem
  - Serve Next.js web app (if self-hosted)
  - WebSocket proxy for Socket.IO
- **Performance:** Gzip compression, browser caching headers

**Docker Containers:**

1. **API Container:**
   - **Image:** node:20-alpine
   - **Exposed Port:** 3000 (internal)
   - **Environment:** Production
   - **Restart Policy:** always
   - **Resource Limits:** 2GB RAM, 2 CPU cores

2. **PostgreSQL Container:**
   - **Image:** postgres:15-alpine
   - **Exposed Port:** 5432 (internal only)
   - **Volume:** `/var/dersimiz/postgres_data`
   - **Backup:** Daily pg_dump via cron
   - **Resource Limits:** 3GB RAM

3. **Redis Container:**
   - **Image:** redis:7-alpine
   - **Exposed Port:** 6379 (internal only)
   - **Volume:** `/var/dersimiz/redis_data`
   - **Persistence:** AOF enabled
   - **Resource Limits:** 1GB RAM

**File Storage (Local Filesystem):**
- **Base Path:** `/var/dersimiz/uploads/`
- **Structure:**
  ```
  /var/dersimiz/uploads/
  ├── avatars/
  │   ├── user_123.jpg
  │   └── user_456.jpg
  └── assets/
      └── app_banner.png
  ```
- **Served By:** NGINX at `https://yourdomain.com/uploads/`
- **Permissions:** `www-data:www-data` (NGINX user)
- **Backup:** Included in daily server backup
- **Image Processing:** Sharp library in Node.js (resize on upload)

**Monitoring:**
- **Errors:** Sentry (free tier)
- **Uptime:** UptimeRobot / Hetrixtools (free)
- **Logs:** Docker logs + logrotate
- **Metrics:** Docker stats, htop
- **Alerts:** Email/Telegram notifications

**Backups:**
- **Database:** Daily pg_dump to `/var/backups/dersimiz/`
- **Files:** Daily rsync to external storage (optional)
- **Retention:** 7 days local, 30 days remote
- **Automation:** Cron jobs

### CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      - name: Run linting
        run: npm run lint
      
  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/dersimiz
            git pull origin main
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
            docker-compose exec -T api npm run migrate
      
  build-mobile:
    needs: test
    runs-on: macos-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Build iOS app (Expo)
        run: eas build --platform ios --profile production
      - name: Submit to App Store Connect
        run: eas submit --platform ios
      - name: Build Android app
        run: eas build --platform android --profile production
      - name: Submit to Google Play Console
        run: eas submit --platform android
```

### Docker Compose Configuration

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dersimiz-api
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://dersimiz:${DB_PASSWORD}@postgres:5432/dersimiz
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SMS_API_KEY=${SMS_API_KEY}
    volumes:
      - /var/dersimiz/uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    networks:
      - dersimiz-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  postgres:
    image: postgres:15-alpine
    container_name: dersimiz-postgres
    restart: always
    environment:
      - POSTGRES_DB=dersimiz
      - POSTGRES_USER=dersimiz
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - /var/dersimiz/postgres_data:/var/lib/postgresql/data
    networks:
      - dersimiz-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 3G

  redis:
    image: redis:7-alpine
    container_name: dersimiz-redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - /var/dersimiz/redis_data:/data
    networks:
      - dersimiz-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G

networks:
  dersimiz-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  uploads:
```

**NGINX Configuration:**
```nginx
# /etc/nginx/sites-available/dersimiz.com

upstream api_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name dersimiz.com www.dersimiz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dersimiz.com www.dersimiz.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dersimiz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dersimiz.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Proxy
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support (Socket.IO)
    location /socket.io/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static Files (Uploads)
    location /uploads/ {
        alias /var/dersimiz/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Web App (if self-hosted)
    location / {
        root /var/www/dersimiz-web;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

---

### Scaling Strategy (Future)

**Vertical Scaling (Initial Approach):**
- Upgrade VPS to higher tier (8GB → 16GB RAM)
- Add more CPU cores
- Increase storage capacity
- Monitor resource usage with `htop` and `docker stats`

**Horizontal Scaling (When Needed):**
- Add second VPS for API (load balance with NGINX)
- Separate database to dedicated VPS
- Use managed PostgreSQL (DigitalOcean Managed Database)
- Add Redis cluster for high availability

**Database Optimization:**
- Connection pooling (PgBouncer container)
- Query optimization and indexing
- Vacuum and analyze regularly
- Monitor slow queries

**Caching Strategy:**
- Redis for session and API caching
- NGINX caching for static files
- Browser caching headers (max-age)
- Database query result caching

**When to Scale:**
- CPU usage consistently > 80%
- RAM usage > 90%
- Response time > 500ms
- More than 1000 concurrent users

---

## Security Best Practices

### Application Security

1. **Authentication:**
   - JWT tokens with short expiration
   - Refresh token rotation
   - Device binding
   - Biometric authentication

2. **Authorization:**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API endpoint protection
   - Admin-only routes

3. **Data Protection:**
   - Encryption at rest (database)
   - Encryption in transit (TLS 1.3)
   - Sensitive data masking in logs
   - PII data minimization

4. **Input Validation:**
   - Server-side validation for all inputs
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize user content)
   - CSRF protection

5. **Rate Limiting:**
   - Per-user rate limits
   - Per-IP rate limits
   - Exponential backoff on failures
   - DDoS protection (CloudFlare)

### Mobile App Security

1. **Code Obfuscation:**
   - ProGuard (Android)
   - App encryption (iOS)
   - Remove console.log in production

2. **Secure Storage:**
   - Encrypted AsyncStorage
   - Keychain (iOS) / Keystore (Android)
   - Never store sensitive data in plain text

3. **API Security:**
   - Certificate pinning
   - API key rotation
   - Request signing
   - Timeout configurations

4. **Reverse Engineering Protection:**
   - Code minification
   - Remove debug symbols
   - Jailbreak/root detection
   - Integrity checks

### Backend Security

1. **Server Hardening:**
   - Firewall configuration
   - SSH key-only access
   - Automatic security updates
   - Fail2ban for brute force protection

2. **Database Security:**
   - Encrypted connections
   - Least privilege access
   - Regular backups
   - SQL injection prevention

3. **Secrets Management:**
   - Environment variables in `.env` file (not in Git)
   - Docker secrets for sensitive data
   - Never commit secrets to Git
   - Rotate secrets regularly
   - Store backups encrypted

4. **Monitoring:**
   - Intrusion detection
   - Anomaly detection
   - Security audit logs
   - Vulnerability scanning

---

## Launch Checklist

### Pre-Launch (4 weeks before)

**Technical:**
- [ ] Complete all features
- [ ] Pass security audit
- [ ] Load testing (1000+ concurrent users)
- [ ] Mobile app beta testing (TestFlight, Google Play Beta)
- [ ] Fix all critical bugs
- [ ] Set up monitoring and alerts
- [ ] Prepare rollback plan

**Content:**
- [ ] Translate all content (TR/EN)
- [ ] Prepare marketing materials
- [ ] Create tutorial videos
- [ ] Write help documentation
- [ ] Set up support email/chat

**Legal:**
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie Policy
- [ ] KVKK compliance (Turkish data protection)
- [ ] GDPR compliance (if EU users)

**Business:**
- [ ] Set pricing
- [ ] Configure payment providers
- [ ] Prepare launch announcement
- [ ] Contact press/influencers
- [ ] Plan launch event

### Launch Day

1. **Deploy to Production:**
   - Deploy backend API
   - Deploy web application
   - Submit mobile apps to stores

2. **Monitor:**
   - Watch error rates
   - Monitor server load
   - Check payment processing
   - Track user registrations

3. **Support:**
   - Have support team ready
   - Monitor support tickets
   - Respond to social media

4. **Marketing:**
   - Send launch emails
   - Post on social media
   - Activate paid ads
   - Press release

### Post-Launch (First Week)

- [ ] Daily metrics review
- [ ] Bug triage and fixes
- [ ] User feedback collection
- [ ] Performance optimization
- [ ] Feature usage analysis
- [ ] Plan first update

---

## Future Enhancements

### Phase 2 (3-6 months)

1. **Video Lessons:**
   - Integrate WebRTC for live video
   - Record and playback lessons
   - Screen sharing capability

2. **Calendar Integration:**
   - Sync with Google Calendar
   - Automated lesson scheduling
   - Reminder notifications

3. **Review System:**
   - Student reviews for tutors
   - Rating system (1-5 stars)
   - Review moderation

4. **Advanced Search:**
   - Filter by rating
   - Filter by price range
   - Filter by availability
   - Save search preferences

### Phase 3 (6-12 months)

1. **Content Library:**
   - Upload study materials
   - Share resources
   - Video tutorials
   - Practice exercises

2. **Gamification:**
   - Achievement badges
   - Leaderboards
   - Streak tracking
   - Rewards program

3. **Referral System:**
   - Refer friends
   - Earn credits
   - Discount codes
   - Affiliate program

4. **Advanced Analytics:**
   - Tutor performance dashboard
   - Student progress tracking
   - Learning insights
   - Predictive analytics

### Phase 4 (12+ months)

1. **AI Tutor Assistant:**
   - AI-powered homework help
   - Automated lesson planning
   - Personalized recommendations
   - Smart matching algorithm

2. **Group Lessons:**
   - Multiple students per lesson
   - Group chat
   - Shared whiteboard
   - Split payments

3. **Certification System:**
   - Tutor verification
   - Background checks
   - Teaching certificates
   - Verified badges

4. **International Expansion:**
   - More languages
   - Multiple currencies
   - Regional pricing
   - Local payment methods

---

## Conclusion

Dersimiz represents a modern, mobile-first approach to online tutoring, leveraging the latest technologies and best practices in mobile app development, real-time communication, and AI-powered safety features.

**Key Success Factors:**
1. **Seamless Mobile Experience:** Native apps with intuitive UX
2. **Frictionless Authentication:** Phone-based OTP (no passwords)
3. **Real-Time Communication:** Instant messaging with push notifications
4. **Safety First:** AI moderation and admin oversight
5. **Scalable Architecture:** Built to handle growth
6. **Data-Driven:** Analytics and insights for continuous improvement

**Next Steps:**
1. Review and approve this architecture document
2. Set up development environment
3. Create detailed technical specifications
4. Begin development (backend → mobile → web)
5. Iterative testing and refinement
6. Beta launch with limited users
7. Full production launch

This document serves as the foundation for building Dersimiz. All development decisions should align with the architecture and principles outlined here.



# Dersimiz Design System & Brand Guidelines (v2.0)

## 1. Brand Essence & Philosophy

**Dersimiz** is designed to feel alive, approachable, and undeniably modern without relying on generic tech aesthetics. The visual identity bridges the generational gap between digital-native students and professional educators through a shared language of clarity and energy.

**Core Concept: "The Spark of Clarity"**
The visual system avoids overly complex gradients or dark, moody themes. Instead, it embraces light, space, and a high-contrast color palette that feels optimistic and clear.

**Design Philosophy:**
*   **Light & Airy:** We are strictly a light-mode application. Shadows are soft and colored (not black), creating a feeling of floating elements.
*   **Function First:** Color is used semantically to guide action, not just decoration.
*   **No "Tech Purple":** We purposefully avoid the standard SaaS purple to stand out as a human-centric education platform.

---

## 2. Color Palette

The color system is built on a "Split Foundation" where the interface adapts its accent colors based on the user persona (Student vs. Tutor), anchored by a shared Primary Blue.

### Primary Brand Color
Used for the logo, primary buttons, and shared navigation elements across both personas.

| Color Name | Hex | Usage |
| :--- | :--- | :--- |
| **Electric Azure** | #2563EB | The heart of the brand. Trustworthy but energetic. Primary Buttons, Links, Active States. |
| **Deep Ocean** | #1E3A8A | Hover states for primary buttons, heavy text headers. |

### Neutral / Structure Colors (Light Mode Only)
The canvas upon which the app is built. Clean, crisp, and high-readability.

| Color Name | Hex | Usage |
| :--- | :--- | :--- |
| **Clean White** | #FFFFFF | Review cards, main content surface. |
| **Mist Blue** | #F1F5F9 | Page backgrounds, secondary button backgrounds. |
| **Carbon Text** | #0F172A | Primary headings (H1-H3), strong body text. |
| **Slate Text** | #64748B | Secondary text, metadata, labels. |
| **Outline Grey** | #E2E8F0 | Borders, dividers (subtle). |

### Student Persona Palette (Gen Z/Alpha)
*Target Vibe: High Energy, Gamification, Focus.*

| Color Name | Hex | Usage |
| :--- | :--- | :--- |
| **Spark Orange** | #F97316 | "Call to Adventure". Secondary CTAs, streaks, gamification rewards. |
| **Neon Lime** | #84CC16 | Success states, correct answers, "Level Up" moments. |
| **Alert Coral** | #EF4444 | Errors, missed deadlines, urgent notifications. |

### Tutor Persona Palette (Gen X/Y/Z)
*Target Vibe: Professional clarity, Calm reliability, Organization.*

| Color Name | Hex | Usage |
| :--- | :--- | :--- |
| **Calm Teal** | #0D9488 | Verified badges, financial positive trends, secondary actions. |
| **Warm Gold** | #F59E0B | Ratings (stars), "Premium" features, highlights. |
| **Soft Indigo** | #4F46E5 | (Sparingly) Used only for deep analytic graphs/charts to differentiate data. |

---

## 3. Typography

A pairing that balances modern display aesthetics with high legibility.

### Primary Display Font: **Outfit**
*   **Personality:** Geometric, friendly, modern.
*   **Usage:** Large Headings (H1, H2), Stats Numbers, Onboarding Titles.
*   **Weights:** Bold (700), SemiBold (600).

### Secondary Body Font: **Inter** or **Public Sans**
*   **Personality:** Invisible, highly legible, neutral.
*   **Usage:** Long-form reading (chat, lesson descriptions), UI Labels, Inputs.
*   **Weights:** Regular (400), Medium (500).

---

## 4. UI Components & "The Light Theme"

We are exclusively a Light Theme application. This requires careful handling of shadows and depth to ensure hierarchy without darkness.

### 1. Cards & Surfaces
Instead of flat borders, use **Colored Shadows** to create depth that feels "alive".

*   **Standard Card:**
    *   Background: #FFFFFF
    *   Border: 1px solid #E2E8F0
    *   Shadow: `0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)` (Subtle Blue Tint)
    *   Radius: `16px` (Modern, soft)

*   **Active/Hover State:**
    *   Transform: `translateY(-2px)`
    *   Shadow: `0 10px 15px -3px rgba(37, 99, 235, 0.15)`

### 2. Buttons
*   **Primary (Shared):**
    *   Background: **Electric Azure** (#2563EB)
    *   Text: #FFFFFF
    *   Radius: `12px` or `Full Pill` (for mobile actions)
    *   Shadow: `0 4px 12px rgba(37, 99, 235, 0.3)` (Glow effect)

*   **Secondary (Student):**
    *   Background: **Mist Blue** (#F1F5F9)
    *   Text: **Electric Azure** (#2563EB)
    *   Border: 2px solid transparent (Hover: **Spark Orange** #F97316)

*   **Secondary (Tutor):**
    *   Background: #FFFFFF
    *   Border: 1px solid **Calm Teal** (#0D9488)
    *   Text: **Calm Teal** (#0D9488)

### 3. Navigation
*   **Mobile Tab Bar:**
    *   Background: #FFFFFF with `backdrop-filter: blur(10px)` (Glassmorphic White)
    *   Active Icon: **Electric Azure** (#2563EB) with a small dot indicator below.
    *   Inactive Icon: **Slate Text** (#64748B)

---

## 5. Iconography

Use a cohesive icon set like **Phosphor Icons** or **Heroicons (Rounded)**.

*   **Style:** `2px` stroke weight. Rounded joins.
*   **Color Strategy:**
    *   Standard UI Icons: **Slate Text** (#64748B)
    *   Active/Selected Icons: **Electric Azure** (#2563EB) filled variant.
    *   Feature Icons (Dashboards): Use a "Duotone" style where the secondary layer is the primary color at 20% opacity.

---

## 6. Logo Guidelines (Refined)

The logo remains the **"Synapse D"** concept but adapted for the new palette.

*   **Construction:**
    *   Main Shape: **Electric Azure** (#2563EB)
    *   The "Spark" Dot: Use **Spark Orange** (#F97316) to represent the energy transfer. This small orange accent on the blue logo makes it instantly recognizable and vibrant.
*   **Background Usage:**
    *   Primary: On **Clean White** (#FFFFFF).
    *   Secondary: On **Mist Blue** (#F1F5F9).
    *   Never place on dark backgrounds (since we are light-theme only).

---

## 7. Tone of Voice & Copy

### Student View ("The Coach")
*   **Voice:** Motivational, Fast, Direct.
*   **Keywords:** Start, Go, Boost, Level Up, Streak.
*   **Example:** "Ready to break your record? Let's start the lesson!"

### Tutor View ("The Professional")
*   **Voice:** Reliable, Clear, Respectful.
*   **Keywords:** Schedule, Insights, Earnings, Verify, Connect.
*   **Example:** "You have 3 upcoming sessions. Your profile visibility is high today."

