# Public Folder

## Purpose
This folder contains all frontend assets including HTML pages, CSS stylesheets, and JavaScript client-side logic. These are served as static files by the Express server.

## Structure

### HTML Pages

**`landing.html`**
- Application homepage/landing page
- Introduction to SafePass ID
- Call-to-action buttons for signup/login
- Feature overview and benefits

**`signup.html`**
- User registration form
- Fields: email, password, confirmation
- Consent checkbox for terms
- reCAPTCHA v2 widget for bot prevention
- Styling: `css/signup.css`
- Logic: `js/signup.js`

**`login.html`**
- User authentication form
- Fields: email, password
- "Forgot your password?" link to reset flow
- reCAPTCHA v2 widget for bot prevention
- Styling: `css/login.css`
- Logic: `js/login.js`
- Stores JWT token in localStorage on successful login

**`forgot-password.html`**
- Multi-step password recovery workflow
- **Step 1:** Identity verification (email, firstName, lastName, dateOfBirth, emergencyContactName, emergencyContactPhone)
- **Step 2:** Reset code verification and new password entry
- **Step 3:** Success confirmation with login redirect
- reCAPTCHA v2 on identity verification step
- Styling: `css/login.css`
- Logic: `js/forgot-password.js`

**`dashboard.html`**
- User dashboard (requires authentication)
- Profile management interface
- Event/access log viewing
- QR code display and management
- Styling: `css/dashboard.css`
- Logic: `js/dashboard.js`

**`public-profile.html`**
- User's public-facing profile page
- Shows limited information (name, photo, public contacts)
- Accessible without authentication
- Styling: `css/public-profile.css`
- Logic: `js/public-profile.js`

**`disabled.html`**
- Error page shown when user account is disabled/locked
- Reason for account status
- Contact support link

**`delete.html`**
- Account deletion confirmation page
- Warning about consequences
- Final deletion confirmation

---

### CSS Stylesheets

**`css/global.css`**
- Global styling applied across all pages
- Root variables (colors, fonts, spacing)
- Base element styles (body, headings, buttons)
- Responsive breakpoints

**`css/landing.css`**
- Landing page specific styles
- Hero section styling
- Feature cards layout
- CTA button styling

**`css/signup.css`**
- Registration form styling
- Form field spacing and appearance
- Consent checkbox styling
- reCAPTCHA container styles
- Error message display
- Responsive form layout

**`css/login.css`**
- Login form styling
- Form field spacing and appearance
- Forgot password link styling
- "Forgot Password" prompt styling
- Multi-step form hidden state (.form-hidden)
- Success container for completed flows
- reCAPTCHA container styles
- Error notification styling

**`css/dashboard.css`**
- Dashboard layout and grid
- Profile section styling
- Navigation sidebar styling
- Log tables and data display
- Modal styling for interactions

**`css/public-profile.css`**
- Public profile page layout
- Limited data display styling
- Profile photo and info styling
- Public contact information display
- Non-interactive styling

**`css/reset.css`**
- CSS reset rules
- Normalize default browser styles
- Consistent element appearance across browsers

---

### JavaScript Files

**`js/utils.js`**
- Shared utility functions used across multiple pages
- Functions:
  - `showNotification(message, type)` - Display toast notifications
  - `validateEmail(email)` - Email format validation
  - `validatePassword(password)` - Password strength validation
  - `storeToken(token)` - Save JWT to localStorage
  - `getToken()` - Retrieve JWT from localStorage
  - `removeToken()` - Clear JWT from localStorage
  - `fetchWithAuth(url, options)` - Fetch with JWT authorization header

**`js/signup.js`**
- Signup form submission handler
- Collects: email, password, consent, reCAPTCHA token
- Validates password strength and consent before submission
- Sends POST to `/api/auth/signup`
- Stores JWT token on success
- Error handling and reCAPTCHA reset on failure
- Redirects to dashboard on successful signup

**`js/login.js`**
- Login form submission handler
- Collects: email, password, reCAPTCHA token
- Validates inputs before submission
- Sends POST to `/api/auth/login` with email, password, recaptchaToken
- Stores JWT token on success
- Error handling and reCAPTCHA reset on failure
- Redirects to dashboard on successful login

**`js/forgot-password.js`**
- Multi-step password reset workflow management
- **Step 1 Handler:**
  - Collects: email, firstName, lastName, dateOfBirth, emergencyContactName, emergencyContactPhone, reCAPTCHA token
  - Validates reCAPTCHA
  - Sends POST to `/api/auth/forgot-password`
- **Step 2 Handler:**
  - Collects: resetCode, newPassword, confirmPassword
  - Validates password match and minimum length
  - Sends POST to `/api/auth/reset-password`
- **Step 3:**
  - Shows success message
  - Auto-redirects to login after 2 seconds
- Error messages for invalid inputs and API errors

**`js/dashboard.js`**
- Dashboard functionality and interactions
- Profile data fetching and display
- QR code generation/display
- Event log management
- Account settings and preferences

**`js/public-profile.js`**
- Public profile page data fetching
- Displays user public information
- No authentication required
- Limited data display

---

### Assets Folder

**`assets/`**
- Images and media files
- Site logo (`logo.jpeg`)
- Icons and graphics
- Profile photos (user uploads)

---

## Frontend-Backend Integration

### Authentication Flow
1. User signs up/logs in on HTML pages
2. JavaScript collects form data + reCAPTCHA token
3. Sends POST request to backend API (`/api/auth/signup` or `/api/auth/login`)
4. Backend validates reCAPTCHA and credentials
5. JavaScript stores returned JWT token
6. Subsequent requests include JWT in Authorization header

### Protected Pages
- Dashboard, profile settings require valid JWT
- `js/utils.js` `fetchWithAuth()` automatically includes JWT in all requests
- Server's `protect` middleware validates token

### reCAPTCHA Integration
- Google reCAPTCHA v2 widget on signup/login/forgot-password
- Token collected before form submission
- Sent to backend for validation with Google API
- Prevents automated bot attacks and brute force

## Responsive Design
All pages use media queries for responsive layouts:
- Mobile (< 768px)
- Tablet (768px - 1024px)
- Desktop (> 1024px)

## Error Handling
- Form validation on client-side before submission
- API error messages displayed in notifications
- Network error handling with user-friendly messages
- Form states reset on successful submission
