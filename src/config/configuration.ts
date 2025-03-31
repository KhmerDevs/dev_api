import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRATION: Joi.string().default('1d'),
  REDIS_URL: Joi.string().required(),
  FIREBASE_ADMIN_PROJECT_ID: Joi.string().required(),
  // Add other environment variables validation
});

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  apiVersion: process.env.API_VERSION,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION,
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
}));

export const firebaseConfig = registerAs('firebase', () => ({
  admin: {
    type: process.env.FIREBASE_ADMIN_TYPE,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_ADMIN_CLIENT_ID,
    authUri: process.env.FIREBASE_ADMIN_AUTH_URI,
    tokenUri: process.env.FIREBASE_ADMIN_TOKEN_URI,
    authProviderX509CertUrl: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
    clientX509CertUrl: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
    universeDomain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN,
  },
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
})); 