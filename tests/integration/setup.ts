process.env.DATABASE_URL =
  process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:27017/thanawico_test";
process.env.AUTH_SECRET ??= "integration-test-secret";
