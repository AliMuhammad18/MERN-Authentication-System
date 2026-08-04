# Authentication System — Sequence Diagrams

Sequence diagrams for every scenario implemented in the MERN Authentication System, traced directly from the code in `Server/Controllers/auth/`, `Server/Middlewares/`, `Server/utils/`, and `Server/config/PassportStrategies/`.

Rendered with [Mermaid](https://mermaid.js.org/) — GitHub renders these natively inside fenced ` ```mermaid ` code blocks, no extra tooling required.

## Table of contents

1. [Signup (OTP-gated)](#1-signup-otp-gated)
2. [Login](#2-login)
3. [Enable 2FA (TOTP setup)](#3-enable-2fa-totp-setup)
4. [Complete 2FA login](#4-complete-2fa-login)
5. [Google OAuth login](#5-google-oauth-login)
6. [Password reset](#6-password-reset)
7. [Refresh token rotation with reuse detection](#7-refresh-token-rotation-with-reuse-detection)

---

## 1. Signup (OTP-gated)

Endpoints: `POST /send-signup-otp` → `POST /verify-signup-otp` → `POST /finish-signup`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant R as Redis
    participant E as Email
    participant DB as MongoDB

    C->>S: POST /send-signup-otp {email}
    alt email missing
        S-->>C: 400 missing fields
    else email provided
        S->>S: generate 6-digit OTP + sessionId
        S->>R: setEx Signup:{sessionId} (10 min)<br/>{email, signupOtp:{value:hashedOtp, verified:false}}
        S->>E: send OTP email
        S-->>C: set signup_session cookie + 200 OTP sent
    end

    C->>S: POST /verify-signup-otp {otp}
    alt otp or sessionId missing
        S-->>C: 400 missing fields
    else
        S->>R: get Signup:{sessionId}
        alt session not found or expired
            S-->>C: 404 session expired
        else session found
            S->>S: bcrypt.compare(otp, signupOtp.value)
            alt invalid otp
                S-->>C: 400 Invalid OTP
            else valid
                S->>R: setEx Signup:{sessionId} {signupOtp.verified:true}
                S-->>C: 200 OTP verified
            end
        end
    end

    C->>S: POST /finish-signup {name, password}
    alt session cookie missing or session expired
        S-->>C: 404 session not found / expired
    else
        alt signupOtp.verified = false
            S-->>C: 401 OTP not verified
        else verified
            S->>DB: create user {name, email, password}
            S->>R: del Signup:{sessionId}
            S-->>C: clear signup_session cookie
            S->>S: refreshTokenFamilyId = crypto.randomUUID()
            S->>S: sign access_token (15 min)
            S-->>C: set access_token cookie
            S->>S: jti = crypto.randomUUID()
            S->>R: setEx Refresh:{jti} (24h)<br/>{userId, createdAt, familyId}
            S->>R: setEx FamilyId:{familyId} (24h) {jti}
            S-->>C: set refresh_token cookie {id, jti, familyId}
            S-->>C: 200 user created successfully
        end
    end
```

---

## 2. Login

Endpoint: `POST /login`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MongoDB
    participant R as Redis
    participant E as Email

    C->>S: POST /login {email, password}
    alt email or password missing
        S-->>C: 400 missing fields
    else
        S->>DB: findOne({email})
        alt user not found OR bcrypt.compare fails
            S-->>C: 400 Invalid Email or Password
        else credentials valid
            alt mfaEnabled = true
                S->>S: sign temp_token (5 min)
                S-->>C: set temp_token cookie
                S-->>C: 200 "2FA is required"
            else mfaEnabled = false
                S->>S: refreshTokenFamilyId = crypto.randomUUID()
                S->>S: sign access_token (15 min)
                S-->>C: set access_token cookie
                S->>S: jti = crypto.randomUUID()
                S->>R: setEx Refresh:{jti} (24h)<br/>{userId, createdAt, familyId}
                S->>R: setEx FamilyId:{familyId} (24h) {jti}
                S-->>C: set refresh_token cookie {id, jti, familyId}
                S->>E: send login notification email
                S-->>C: 200 user logged in successfully
            end
        end
    end
```

---

## 3. Enable 2FA (TOTP setup)

Endpoints: `POST /enable-2fa` → `POST /verify-2fa`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MongoDB

    Note over C,S: user authenticated via access_token

    C->>S: POST /enable-2fa
    alt user not found
        S-->>C: 401 user not found
    else
        alt mfaEnabled already true
            S-->>C: 400 MFA already enabled
        else
            S->>S: speakeasy.generateSecret()
            S->>DB: save tempMfaSecret
            S->>S: generate QR code data URL
            S-->>C: 200 {qrCodeDataUrl}
        end
    end
    Note over C: user scans QR in authenticator app

    C->>S: POST /verify-2fa {otp}
    alt user not found
        S-->>C: 404 user not found
    else
        alt tempMfaSecret missing
            S-->>C: 400 "No pending 2FA setup found. Call /enable-2fa first."
        else
            S->>S: speakeasy.totp.verify(tempMfaSecret, otp)
            alt invalid otp
                S-->>C: 400 Invalid OTP
            else valid
                S->>DB: mfaSecret = tempMfaSecret
                S->>DB: mfaEnabled = true
                S->>DB: tempMfaSecret = null
                S->>S: generateBackupCodes()
                S->>DB: save hashed backup codes
                S-->>C: clear access_token cookie
                S-->>C: set new access_token cookie
                S-->>C: 200 {backupCodes, message}
            end
        end
    end
```

---

## 4. Complete 2FA login

Endpoints: `POST /complete-2fa-login` (TOTP) or `POST /login-with-backup-code` (fallback)

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MongoDB
    participant R as Redis
    participant E as Email

    Note over C,S: client holds temp_token from /login

    alt has authenticator app
        C->>S: POST /complete-2fa-login {otp}
        alt user not found
            S-->>C: 404 user not found
        else
            alt mfaEnabled=false or mfaSecret missing
                S-->>C: 400 2FA not enabled
            else
                S->>S: speakeasy.totp.verify(mfaSecret, otp)
                alt invalid otp
                    S-->>C: 400 Invalid OTP
                end
            end
        end
    else lost device, uses backup code
        C->>S: POST /login-with-backup-code {backupCode}
        alt user not found
            S-->>C: 404 user not found
        else
            alt mfaEnabled = false
                S-->>C: 400 2FA already disabled
            else
                S->>S: verifyBackupCode(user, backupCode)
                alt invalid backup code
                    S-->>C: 400 Invalid backup code
                else valid
                    S->>DB: remove used backup code
                end
            end
        end
    end

    Note over C,S: on success (either path)
    S-->>C: clear temp_token cookie
    S->>S: refreshTokenFamilyId = crypto.randomUUID()
    S->>S: sign access_token (15 min)
    S-->>C: set access_token cookie
    S->>S: jti = crypto.randomUUID()
    S->>R: setEx Refresh:{jti} (24h)<br/>{userId, createdAt, familyId}
    S->>R: setEx FamilyId:{familyId} (24h) {jti}
    S-->>C: set refresh_token cookie {id, jti, familyId}
    S->>E: send login notification email
    S-->>C: 200 login completed successfully
```

---

## 5. Google OAuth login

Endpoints: `GET /auth/google` → `GET /auth/google/callback`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant G as Google
    participant DB as MongoDB
    participant R as Redis
    participant E as Email

    C->>S: GET /auth/google
    S-->>C: redirect to Google consent screen
    C->>G: user authorizes
    G-->>S: GET /auth/google/callback {code}
    S->>G: exchange code for profile
    G-->>S: profile {googleId, email, name}

    S->>DB: findOne({googleId})
    alt googleId not found
        S->>DB: findOne({email})
        alt existing password account found
            S->>DB: link googleId to existing user
        else no account exists
            S->>DB: create user {name, email, googleId}
        end
    end
    S->>E: send "continue with Google" email

    alt mfaEnabled = true
        S->>S: sign temp_token (5 min)
        S-->>C: set temp_token cookie
        S-->>C: redirect to /verify-2fa
    else mfaEnabled = false
        S->>S: refreshTokenFamilyId = crypto.randomUUID()
        S->>S: sign access_token (15 min)
        S-->>C: set access_token cookie
        S->>S: jti = crypto.randomUUID()
        S->>R: setEx Refresh:{jti} (24h)<br/>{userId, createdAt, familyId}
        S->>R: setEx FamilyId:{familyId} (24h) {jti}
        S-->>C: set refresh_token cookie {id, jti, familyId}
        S-->>C: redirect to /home
    end
```

---

## 6. Password reset

Endpoints: `POST /send-password-reset-otp` → `POST /verify-password-reset-otp` → `POST /reset-password`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MongoDB
    participant R as Redis
    participant E as Email

    C->>S: POST /send-password-reset-otp {email}
    alt email missing
        S-->>C: 400 missing fields
    else
        S->>DB: findOne({email})
        DB-->>S: user or null
        S->>S: generate OTP + sessionId
        S->>R: setEx PasswordReset:{sessionId} (10 min)<br/>{userId: user?._id, otp:{value:hashedOtp, verified:false}}
        S-->>C: set password_reset_session cookie
        S->>E: send OTP email
        S-->>C: 200 OTP sent (always, even if no account)
    end

    C->>S: POST /verify-password-reset-otp {otp}
    alt otp missing
        S-->>C: 400 missing fields
    else
        S->>R: get PasswordReset:{sessionId}
        alt session not found
            S-->>C: 404 session not found
        else
            S->>S: bcrypt.compare(otp, sessionData.otp.value)
            alt invalid otp
                S-->>C: 401 invalid OTP
            else valid
                alt userId missing (no account for email)
                    S-->>C: 404 "user doesn't exist. Create new account"
                else
                    S->>R: set PasswordReset:{sessionId} {otp.verified:true} KEEPTTL
                    S-->>C: 200 OTP verified
                end
            end
        end
    end

    C->>S: POST /reset-password {password}
    alt session cookie missing or session expired
        S-->>C: 404 session not found / expired
    else
        alt otp.verified = false
            S-->>C: 400 OTP not verified
        else
            alt password missing
                S-->>C: 400 missing fields
            else
                S->>DB: findById(userId)
                S->>DB: user.password = newPassword save()
                S->>R: unlink PasswordReset:{sessionId}
                S-->>C: clear password_reset_session cookie
                S-->>C: 200 password reset successfully
            end
        end
    end
```

---

## 7. Refresh token rotation with reuse detection

Endpoint: `POST /refresh`

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant R as Redis
    participant DB as MongoDB

    C->>S: POST /refresh (refresh_token cookie)
    S->>S: jwt.verify(refresh_token)
    S->>R: SET NX Lock:Refresh:{jti} (10s expiry)
    alt lock not acquired
        S-->>C: 429 refresh already in progress
    else lock acquired
        S->>R: get Refresh:{jti}
        alt token data missing (reuse detected)
            S->>R: unlink Refresh:{jti} + FamilyId:{familyId}
            Note over S: entire token family revoked
            S-->>C: 403 invalid refresh token
        else token data found
            S->>R: ttl Refresh:{jti} (preserve remaining window)
            S->>DB: findById(user)
            S->>R: setEx new Refresh:{jti} + FamilyId:{familyId}
            S-->>C: set new refresh_token (rotated jti, same family)
            S-->>C: set new access_token (15 min)
            S->>R: unlink old Refresh:{jti}
            S-->>C: 200 access token refreshed
        end
    end
```
