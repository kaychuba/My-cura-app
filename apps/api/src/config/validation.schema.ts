import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('mycura'),
  DB_PASSWORD: Joi.string().default('mycura'),
  DB_NAME: Joi.string().default('mycura'),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().default(20),

  // JWT
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.default('dev-jwt-secret-change-in-production'),
  }),
  JWT_REFRESH_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.default('dev-refresh-secret-change-in-production'),
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Encryption
  ENCRYPTION_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().length(64).required(),
    otherwise: Joi.default('0'.repeat(64)),
  }),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),

  // AWS
  AWS_REGION: Joi.string().default('eu-west-2'),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  S3_BUCKET_UPLOADS: Joi.string().default('mycura-uploads-dev'),
  S3_BUCKET_REPORTS: Joi.string().default('mycura-reports-dev'),
  SES_FROM_EMAIL: Joi.string().email().default('noreply@mycura.io'),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional(),

  // Anthropic
  ANTHROPIC_API_KEY: Joi.string().optional(),

  // Elasticsearch
  ELASTICSEARCH_NODE: Joi.string().default('http://localhost:9200'),
  ELASTICSEARCH_USERNAME: Joi.string().optional(),
  ELASTICSEARCH_PASSWORD: Joi.string().optional(),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3001'),
});
