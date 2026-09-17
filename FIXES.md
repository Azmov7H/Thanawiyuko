# Fixes Applied

## 1. Turbopack Module Factory Error
**Error**: `Module factory is not available` for `jsx-dev-runtime.js`

**Cause**: `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/:path*` prevented HMR chunk updates in development.

**Fix** (`next.config.ts:40-43`):
```typescript
{
  source: "/_next/static/:path*",
  headers: [
    { key: "Cache-Control", value: process.env.NODE_ENV === "production" ? "public, max-age=31536000, immutable" : "no-cache, must-revalidate" },
  ],
},
```
Then: `rm -rf .next && pnpm dev`

---

## 2. NextAuth UnsupportedStrategy Error
**Error**: `Signing in with credentials only supported if JWT strategy is enabled`

**Cause**: Using `session: { strategy: "database" }` with Credentials provider in NextAuth v5.

**Fix** (`src/server/auth/config.ts:16`):
```typescript
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
```

**Additional fix** - Added proper JWT callbacks (`src/server/auth/config.ts:54-68`):
```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      const u = user as unknown as { id: string; role?: string };
      token.id = u.id;
      token.role = u.role ?? "student";
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as { id?: string }).id = token.id as string;
      (session.user as { role?: string }).role = token.role as string;
    }
    return session;
  },
},
```

---

## 3. React "Objects are not valid as a React child" Error
**Error**: `found: object with keys {level, next, need}` in `XpProgress`

**Cause**: API returned full `xpForNextLevel` object `{ level, next, need }` but component expected `nextLevelXp` as number.

**Fix** (`src/app/api/gamification/route.ts:35-38`):
```typescript
const nextXP = xpForNextLevel(totalXP);

return NextResponse.json({
  xp: { total: totalXP, today: todayXP, level, nextLevelXp: nextXP.next },
```

---

## Verification
All endpoints now return 200:
- `GET /api/auth/session` ✓
- `GET /dashboard` ✓
- `GET /api/gamification` ✓ (returns correct shape)