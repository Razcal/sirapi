# PROVERTI - Supabase Setup Guide

## 📋 Langkah 1: Setup Database Supabase

### 1.1 Buat Table `users`

Buka SQL Editor di Supabase dashboard Anda dan jalankan query berikut:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  desa VARCHAR(100) NOT NULL,
  dusun VARCHAR(100),
  rt VARCHAR(10),
  rw VARCHAR(10),
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()),
  CONSTRAINT fk_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes untuk phone lookup
CREATE UNIQUE INDEX users_phone_idx ON users(phone);

-- Create indexes untuk email lookup
CREATE UNIQUE INDEX users_email_idx ON users(email);

-- Create indexes untuk search
CREATE INDEX users_kecamatan_idx ON users(kecamatan);
CREATE INDEX users_created_at_idx ON users(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users dapat read own profile
CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users dapat update own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: New users dapat insert their profile saat register
CREATE POLICY "Users can insert their own profile during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 1.2 Configure Supabase Auth Settings

1. Pergi ke **Authentication > Policies**
2. Enable **Email Auth** (sudah default)
3. Disable **Confirm email** (optional, untuk testing lebih mudah)
4. Set **Email change token expiry** = 24 hours
5. Set **Password change token expiry** = 24 hours

## 🔐 Langkah 2: Setup Environment Variables

1. Copy file `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```

2. Update `.env.local` dengan credentials Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Dapatkan credentials dari:
- **URL**: Settings > API > Project URL
- **Anon Key**: Settings > API > Project API Keys (anon/public)

## 🚀 Langkah 3: Fitur Authentication

### Register (Sign Up)
- Email Address (unik)
- Phone number (WA aktif, unik)
- Password (min 6 karakter)
- Confirm Password (harus sama)
- Nama lengkap
- Kecamatan
- Desa/Kelurahan
- Dusun (opsional)
- RT
- RW

Validasi:
- ✅ Validasi format email
- ✅ Cek duplikasi email
- ✅ Cek duplikasi nomor HP
- ✅ Konfirmasi password real-time (hijau = cocok, merah = tidak cocok)
- ✅ Validasi password minimal 6 karakter
- ✅ Data profil tersimpan di table `users`

### Login (Sign In)
- Email OR Phone number (bisa salah satu)
- Password
- Remember me (optional)

Validasi:
- ✅ Cek email/HP + password valid
- ✅ Generate session token
- ✅ Load user profile

### Logout
- Clear session
- Remove token dari localStorage

## 💾 Storage & Token Management

### Local Storage Keys
```javascript
proverti_user    // User profile data
proverti_token   // Session access token
```

### User Profile Structure
```javascript
{
  id: "uuid",
  phone: "08123456789",
  name: "John Doe",
  kecamatan: "Tuban",
  desa: "Baturetno",
  dusun: "Dusun A",
  rt: "01",
  rw: "02",
  photo: null,
  created_at: "2024-03-23T10:00:00Z",
  updated_at: "2024-03-23T10:00:00Z"
}
```

## 🛣️ Navigation Flow

```
Splash Screen
    ↓
[Punya Akun?]
    ├─ YA  → Login Screen → Dashboard
    └─ TIDAK → Register Screen → Login Screen → Dashboard
```

## 📱 API Methods Available

### `authService.register(phone, password, profileData)`
Mendaftarkan user baru

### `authService.login(phone, password)`
Login dengan email (pseudo) dan password

### `authService.logout()`
Logout user

### `authService.getCurrentUser()`
Ambil data user yang sedang login

### `authService.updateUserProfile(userId, updates)`
Update profil user

## 🔗 File Structure

```
src/
├── core/
│   ├── authService.js      # Auth logic
│   ├── supabaseClient.js   # Supabase config
│   ├── helpers.js          # Helper functions
│   ├── constants.js        # Constants
│   └── components/
│       └── SharedUI.jsx    # Shared components
├── AuthScreen.jsx          # Auth UI dengan Supabase
└── ...
```

## ⚠️ Important Notes

1. **Phone Email Format**: Nomor HP di-format menjadi email `{phone}@proverti.app` untuk Supabase Auth
2. **Security**: Jangan commit `.env.local` ke git
3. **Password Hashing**: Supabase otomatis hash password
4. **RLS**: Row Level Security aktif untuk data protection
5. **Token**: Access token disimpan dan digunakan untuk API calls

## 🧪 Testing Credentials

Gunakan credentials ini untuk testing:
```
Phone: 0812345678
Password: password123

Profile Data:
- Name: Test User
- Kecamatan: Tuban
- Desa: Baturetno
- RT: 01
- RW: 02
- Dusun: (kosong/opsional)
```

## 🐛 Troubleshooting

### "Nomor HP atau Password salah"
- Pastikan nomor HP sudah terdaftar
- Cek password benar
- Cek format nomor HP

### "Nomor HP ini sudah terdaftar"
- Gunakan nomor HP yang berbeda
- Atau gunakan akun yang sudah ada untuk login

### CORS Error
- Pastikan Supabase URL benar di `.env.local`
- Pastikan anon key benar

### Token not saving
- Cek browser localStorage enabled
- Cek network tab untuk response dari Supabase

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase SQL](https://supabase.com/docs/guides/database)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
