# Dersimiz API – App routes (mobile)

Base URL: `/api/v1`. Auth: Bearer token in `Authorization` header unless marked *public*.

## Auth (no token)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/request-otp | Request SMS OTP (body: phone_number, country_code). Returns session_token; OTP stored in Redis. |
| POST | /auth/verify-otp | Verify OTP (body: session_token?, phone_number, otp_code, country_code?). Tokens stored in Redis (jti). |
| POST | /auth/refresh | New access token (body: refresh_token) |

## Auth (token required)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/logout | Logout (Bearer). Revokes current access token in Redis. |

## Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | /profile | Current user profile. Students: school_name, grade_id (single). Tutors: schools[], grades[] (multiple). |
| PUT | /profile | Update profile (body: full_name?, school_name?, grade_id?, role?). school_name/grade_id apply to students; tutors use /tutor/schools and /tutor/grades. |
| POST | /profile/avatar | Upload avatar (multipart: avatar file) |
| DELETE | /profile | Soft delete account |
| GET | /profile/completeness | Tutor only: 0–100 completeness + details (name, avatar, lessons, availability) |

## Onboarding

| Method | Path | Description |
|--------|------|-------------|
| GET | /onboarding/status | Progress (current_step, data, onboarding_completed) |
| POST | /onboarding/step | Save step (body: step, data?, completed?) |
| GET | /onboarding/data | *Public.* Locations, school_types, grades, lesson_types |
| GET | /locations | *Public.* Hierarchical locations: no query = roots (countries); ?parent_id=&lt;uuid&gt; = children (type: country \| state \| city \| district) |

## Tutor (role = tutor)

All tutor routes require `role: 'tutor'` (enforced; token role is synced from profile).

| Method | Path | Description |
|--------|------|-------------|
| GET | /tutor/dashboard | Stats: impressions, contacts, lesson_count, profile_completeness (0–100), subscription_status (plan_slug, plan_name), profile |
| GET | /tutor/students | Connected students (id, full_name, avatar_url, last_contact) |
| GET | /tutor/lessons | My lesson types & pricing (id, lesson_type_id, price_per_hour_cents, currency, lesson_type) |
| GET | /tutor/lessons/:id | Single lesson (same shape) |
| POST | /tutor/lessons | Add/update (body: lesson_type_id, price_per_hour_cents, currency?). Returns `lesson` + message |
| PUT | /tutor/lessons/:id | Update pricing (body: price_per_hour_cents?, currency?). Returns `lesson` + message |
| DELETE | /tutor/lessons/:id | Remove lesson type |
| GET | /tutor/availability | Weekly slots (JSONB array) |
| PUT | /tutor/availability | Update slots (body: slots[]) |
| GET | /tutor/subscription | Current subscription (plan details) or null |
| POST | /tutor/subscription | Stub – use IAP + POST /iap/verify |
| GET | /tutor/boosters | Active boosters (id, booster_id, activated_at, expires_at, booster slug/display_name/search_ranking_boost) |
| POST | /tutor/boosters | Stub – use IAP + POST /iap/verify |
| GET | /tutor/schools | Tutor's schools (multiple; array of { id, school_name }) |
| POST | /tutor/schools | Add school (body: school_name) |
| DELETE | /tutor/schools/:id | Remove school |
| GET | /tutor/grades | Tutor's grades (multiple; array of { id, name, school_type_id }) |
| POST | /tutor/grades | Add grade (body: grade_id) |
| DELETE | /tutor/grades/:gradeId | Remove grade |

## Student (role = student)

| Method | Path | Description |
|--------|------|-------------|
| GET | /student/dashboard | Stats (conversations, favorites, searches) |
| POST | /student/search | Search tutors (body: lesson_type_id?, location_id?, weekly_lesson_count?, availability?). Returns tutors with lessons, is_favorite, availability_slots. |
| GET | /student/search/history | Last 20 searches |
| GET | /student/lesson-preferences | Stored lesson types student wants to take (multiple) |
| POST | /student/lesson-preferences | Add lesson type (body: lesson_type_id) |
| DELETE | /student/lesson-preferences/:lessonTypeId | Remove lesson type |
| GET | /student/favorites | List favorite tutors with lessons and favorited_at |
| GET | /student/tutors | Connected tutors (with conversation) |
| POST | /student/favorites/:tutorId | Add favorite |
| DELETE | /student/favorites/:tutorId | Remove favorite |

## Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | /chat/conversations | Create conversation (body: tutor_id) – student only |
| GET | /chat/conversations | List my conversations (with other user + last_message) |
| GET | /chat/conversations/:id | Single conversation details (other user, last_message) |
| GET | /chat/conversations/:id/messages | Messages (?limit=50&before=message_id for older messages, returns has_more) |
| POST | /chat/conversations/:id/messages | Send message (body: type?, content?, payload?) |
| POST | /chat/conversations/:id/read | Mark as read |
| POST | /chat/conversations/:id/share-contact | Share phone (body: phone_number?) |
| POST | /chat/conversations/:id/demo-request | Demo request (body: lesson_type_id?, preferred_times?) |

## Support

| Method | Path | Description |
|--------|------|-------------|
| GET | /support/conversation | My support ticket + messages |
| POST | /support/messages | Send message (body: body, subject?) |
| PUT | /support/conversation/status | Update status (body: status: open|replied|closed) |

## Me (subscription, transactions, notifications, settings)

| Method | Path | Description |
|--------|------|-------------|
| GET | /me/settings | Profile + notification_preferences (for settings screen) |
| GET | /me/subscription | Current subscription + active boosters |
| GET | /me/transactions | Last 50 transactions |
| GET | /me/notification-preferences | Get preferences |
| PUT | /me/notification-preferences | Update (body: new_message?, approval_status?, …) |
| GET | /me/notifications | In-app notification list (?limit=20) |
| PUT | /me/notifications/:id/read | Mark notification as read |

## IAP

| Method | Path | Description |
|--------|------|-------------|
| POST | /iap/verify | Verify Apple/Google receipt (body: platform, receipt, transaction_id, product_id) |

## Legal

| Method | Path | Description |
|--------|------|-------------|
| GET | /legal/required | Documents user must accept (required_documents[]) |
| POST | /legal/accept | Accept documents (body: document_ids[]) |
| GET | /legal/public | *Public.* Latest legal documents (no auth) |

## Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | /subscription-plans | Active plans (for app store) |
| GET | /boosters | Active boosters |
| GET | /onboarding/data | Locations, school_types, grades, lesson types |

---

All success responses: `{ success: true, data: ... }`.  
Errors: `{ success: false, error: { code, message, details? } }`.
