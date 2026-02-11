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
