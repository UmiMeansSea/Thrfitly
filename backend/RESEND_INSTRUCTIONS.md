# Resend Email Setup Instructions

## 1. Create .env file
Copy `.env.example` to `.env` in the backend directory:

```bash
cp .env.example .env
```

## 2. Get Resend API Key
1. Sign up at https://resend.com
2. Go to API Keys: https://resend.com/api-keys
3. Create a new API key
4. Add your API key to `.env`:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

## 3. Verify Sender Domain
1. In Resend dashboard, add and verify your sending domain
2. Update `.env` with your verified sender email:
   ```
   RESEND_FROM_EMAIL=noreply@yourverifieddomain.com
   ```

## 4. Install Dependencies
```bash
npm install
```

## 5. Test Email Functionality
Start the server and register a new user to test welcome emails.

## Key Changes Made
- Replaced `nodemailer` with `resend` package
- Updated all email functions to use Resend API
- Changed environment variables from Gmail to Resend
- Updated error handling for Resend API responses
