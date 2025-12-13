# Google OAuth Setup Guide untuk Multiple Users

## 📋 Overview
Sekarang aplikasi sudah menggunakan **Google Sign-In JavaScript SDK** yang proper untuk multiple users. User tinggal klik "Sign in with Google" dan langsung bisa export ke Google Docs dengan akun mereka sendiri.

## 🚀 Cara Setup Google OAuth

### 1. Google Cloud Console Setup

1. **Buka Google Cloud Console**: https://console.cloud.google.com/
2. **Buat Project Baru** (atau pilih existing project)
3. **Enable Google Docs API**:
   - Pergi ke "APIs & Services" > "Library"
   - Cari "Google Docs API"
   - Klik "Enable"

### 2. OAuth Consent Screen

1. Pergi ke "APIs & Services" > "OAuth consent screen"
2. **External** (kalo masih free tier) → Continue
3. **App information**:
   - App name: `Indonesian Scientific Paper Corrector`
   - User support email: your email
   - Developer contact: your email
4. **Scopes**: Add scope `https://www.googleapis.com/auth/documents`
5. **Test users**: Add email addresses untuk testing
6. **Summary** → Save and Continue

### 3. OAuth Credentials

1. Pergi ke "APIs & Services" > "Credentials"
2. **Create Credentials** → "OAuth client ID"
3. **Application type**: "Web application"
4. **Name**: `Indonesian Paper Corrector Client`
5. **Authorized JavaScript origins**:
   - `http://localhost:3000` (untuk development)
   - `https://yourdomain.com` (untuk production)
6. **Authorized redirect URIs**:
   - `http://localhost:3000` (untuk development)
   - `https://yourdomain.com` (untuk production)
7. **Create** → Copy Client ID

### 4. Setup Environment Variables

1. **Copy** `.env.example` to `.env`:
   ```bash
   cp client/.env.example client/.env
   ```

2. **Edit** `client/.env`:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
   REACT_APP_API_URL=http://localhost:5000
   ```

### 5. Testing

1. **Start development server**:
   ```bash
   cd client
   npm start
   ```

2. **Test OAuth flow**:
   - Buka http://localhost:3000
   - Klik "Sign in with Google"
   - Login dengan Google account
   - Upload file dan test export ke Google Docs

## 🔒 Security Notes

- **Client ID** aman untuk di-publish (bukan secret)
- **Client Secret** tetap harus private (tidak ada di frontend)
- Tokens akan di-handle otomatis oleh Google SDK
- User harus give consent untuk Google Docs access

## 📱 User Experience

Sekarang user experience:
1. User buka aplikasi
2. Klik "Sign in with Google" button
3. Popup Google login muncul
4. User login dan give consent
5. Automatic redirect back ke app
6. User bisa langsung export ke Google Docs dengan akun mereka

## 🛠️ For Production

1. **Update OAuth settings** dengan production domain
2. **Submit untuk verification** kalo mau public
3. **Update environment variables** di hosting
4. **Test** di production environment

## ❓ Troubleshooting

**Error: "Client ID not found"**
- Cek `.env` file sudah di-setup
- Client ID format: `xxxxxxxxxx.apps.googleusercontent.com`

**Error: "Unauthorized"**
- Cek OAuth consent screen sudah di-setup
- Test users sudah di-add

**Error: "Google Docs API not enabled"**
- Enable Google Docs API di Google Cloud Console

## 🔄 Migration dari Manual Token

**Before**: User harus manual copy-paste access token
**Now**: User tinggal klik "Sign in with Google" 

Much better! ✨