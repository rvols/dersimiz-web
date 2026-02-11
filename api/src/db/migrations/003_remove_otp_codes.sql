-- OTP codes moved to Redis (session-based, no persistence in DB)
DROP TABLE IF EXISTS otp_codes;
