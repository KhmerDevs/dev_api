# Admin Account Security Guidelines

## Initial Setup
1. Set strong admin password (min 10 chars with uppercase, lowercase, numbers, and special chars)
2. After creating admin, set `ENABLE_INITIAL_ADMIN=false` in .env
3. Admin creation is time-limited and will expire

## Production Security
1. Do not enable admin creation in production via env vars
2. Use `ALLOW_ADMIN_IN_PRODUCTION=true` only in emergency situations
3. Admin tokens expire after 1 hour
4. All admin actions are logged

## Best Practices
1. Regularly rotate admin passwords
2. Consider implementing IP restrictions for admin endpoints
3. Monitor admin login attempts
4. Use a secrets manager rather than env vars in production 