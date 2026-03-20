# LMS Frontend (Next.js)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app expects the backend at `NEXT_PUBLIC_API_URL` and the AI engine at `NEXT_PUBLIC_AI_API_URL`.

## Testing

```bash
npx tsc --noEmit
npm test
npx playwright test
```

Current frontend coverage includes:
- Vitest component and page tests for auth flows, pricing redirects, admin role visibility, and user-management states
- Playwright browser smoke tests for auth entry points, pricing behavior, admin access, AI logs, and institution panel error handling

## Instructor Flow

1. Open `/dashboard` and register as `instructor`.
2. Create courses, modules, and lessons in the Instructor Console.
3. Open `/course/[id]` to update progress with a lesson ID.
4. Use the Course Manager to delete courses, modules, or lessons.
