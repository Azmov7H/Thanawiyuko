import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";

function assertTestDatabase() {
  const name = mongoose.connection.name;
  if (!name || !/_test$/.test(name)) {
    throw new Error(
      `Refusing to run integration tests against database "${name}" (expected a name ending in _test)`,
    );
  }
}

export async function connectTestDb() {
  await dbConnect();
  assertTestDatabase();
}

export async function resetTestDb() {
  assertTestDatabase();
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDb() {
  assertTestDatabase();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  (globalThis as { __mongoosePromise?: unknown }).__mongoosePromise = undefined;
}
