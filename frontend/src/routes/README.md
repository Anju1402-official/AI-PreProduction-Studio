# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

**Note on `src/pages/` and `src/dashboard/`:** the warning above is about
routing — don't try to make `src/pages/*.tsx` files into routes the way
Next.js would. This project does have a `src/pages/` directory and a
`src/dashboard/` directory, but they hold plain component modules that
route files in `src/routes/` import and render — they aren't themselves
part of the file-based routing convention.

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
