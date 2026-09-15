/**
 * Promote a user to admin. Usage: npm run make-admin -- user@example.com
 * First-admin bootstrap for the internal CMS (M2). Requires DATABASE_URL.
 */
import mongoose from "mongoose";
import { UserModel } from "../src/server/modules/auth/user.model";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run make-admin -- user@example.com");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await mongoose.connect(url);
  const user = await UserModel.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { new: true },
  ).lean();
  if (!user) throw new Error(`No user found with email ${email}`);
  console.log(`Promoted ${email} to admin.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
