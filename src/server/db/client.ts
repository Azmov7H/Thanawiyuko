import mongoose from "mongoose";
import { MongoClient } from "mongodb";

function requireDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  return url;
}

declare global {
  var __mongoosePromise: Promise<typeof mongoose> | undefined;
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

/** Shared Mongoose connection for domain models (lazy — never connects at build). */
export function dbConnect(): Promise<typeof mongoose> {
  if (!global.__mongoosePromise) {
    global.__mongoosePromise = mongoose.connect(requireDbUrl(), {
      maxPoolSize: 10,
    });
  }
  return global.__mongoosePromise;
}

/** Raw driver client for the Auth.js MongoDB adapter (its own collections). */
export function authMongoClient(): Promise<MongoClient> {
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(requireDbUrl());
    global.__mongoClientPromise = client.connect();
  }
  return global.__mongoClientPromise;
}
