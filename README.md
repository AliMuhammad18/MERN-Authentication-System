# MERN-Authentication-System
# 🔐 MERN Authentication System

A production-ready authentication system built with the **MERN Stack** that demonstrates modern authentication architecture and security best practices.

The application is deployed as a **single web application** where **Express.js serves the React frontend**, eliminating cross-origin authentication issues while simplifying deployment and cookie management.

🌐 **Live Demo:** https://ali-auth.onrender.com

---

# Features

## Authentication

* Email & password authentication
* Google OAuth 2.0 authentication
* JWT-based authentication
* HTTP-only Secure Cookies
* Protected API routes
* Persistent login sessions
* Secure logout

---

## Two-Factor Authentication (2FA)

The application includes an optional authenticator app based second authentication factor.

### Features

* Temporary authentication token during verification
* OTP expiration
* TOTP Provided by auth apps 
* One-time-use verification codes
* Secure verification flow before issuing authentication tokens

### Recovery Codes

When enabling 2FA, users receive a set of recovery codes that can be used if access to their email is unavailable.

* Securely generated recovery codes
* Hashed before storage
* Single-use recovery codes
* Remaining recovery codes are preserved after each use


---

## Refresh Token Rotation

The project implements refresh token rotation instead of long-lived refresh tokens.

Every successful refresh request:

* Invalidates the previous refresh token
* Issues a brand-new refresh token
* Issues a new access token
* Updates the active token family

This significantly reduces the impact of stolen refresh tokens.

---

## Refresh Token Reuse Detection

The authentication system detects refresh token replay attacks.

If an already-used refresh token is presented:

* The reuse is detected
* The entire refresh token family is revoked
* All active sessions belonging to that token family become invalid
* The user is required to authenticate again

This protects against refresh token theft and replay attacks.

---

## Redis Integration

Redis is used as the server-side authentication store.

It manages:

* Refresh token sessions
* Token family tracking
* Refresh token rotation
* Refresh token reuse detection
* Temporary authentication sessions
* OTP verification sessions
* Automatic expiration using Redis TTL

Using Redis allows authentication state to expire automatically without scheduled cleanup jobs.

---

## Email Services

The application uses **Brevo** for transactional emails.

Email functionality includes:

* Account verification
* Login OTP delivery
* Password reset
* Recovery notifications

---

## Rate Limiting

Multiple layers of rate limiting protect the application against abuse.

Examples include:

* Login endpoint protection
* OTP verification attempts
* Password reset requests
* Email verification requests
* Authentication endpoints

This reduces the risk of brute-force attacks and automated abuse.

---

## Security

The application follows modern authentication security practices.

### Authentication

* JWT Authentication
* Refresh Token Rotation
* Refresh Token Reuse Detection
* HTTP-only Cookies
* Secure Cookie Configuration
* SameSite Cookie Protection

### Password Security

* bcrypt password hashing
* Password strength validation
* Secure password reset flow

### API Security

* Helmet security headers
* Request validation
* Centralized error handling
* Environment variable configuration

---

# Architecture Highlights

* MERN Stack
* Express.js REST API
* React Single Page Application
* Express serves the production React build
* MongoDB for persistent data
* Redis for authentication session management
* Passport.js for Google OAuth
* Brevo transactional email integration

---

# Deployment

The application is deployed as a **single Render Web Service**.

Architecture:

```text
Browser
    │
    ▼
Express Server
    ├── REST API
    ├── Authentication
    └── Serves React Static Files
            │
            ▼
        React SPA
```
For more information about the system workflow check AUTH_SEQUENCE_DIAGRAMS.md which demonstrates the detailed information about the system workflow with sequence diagrams.

Serving the frontend from the same Express application allows authentication cookies to remain **same-site**, avoiding the complexity of cross-origin cookie configuration while improving security.

---

# Technologies

### Frontend

* React
* React Router
* Vite

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Redis

### Authentication

* JWT
* Passport.js
* Google OAuth 2.0
* bcrypt

### Security

* Helmet
* Rate Limiting
* HTTP-only Cookies
* Refresh Token Rotation
* Refresh Token Reuse Detection

### Email

* Brevo API

---

# Project Goal

This project was built to demonstrate how a production-oriented authentication system can be designed with modern security practices, scalable session management using Redis, secure JWT authentication, multi-factor authentication, and refresh token rotation with replay attack detection.
