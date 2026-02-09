# Wine Stock MVP - Claude Rules

## Project Context
Internal stock & price management system for wine distributor (≤10 users).
Tech Stack: Node.js + Express + EJS + HTMX + Tailwind + Prisma + SQLite.

## Core Constraints
- **No fabrication**: Use only confirmed requirements. Mark assumptions clearly.
- **SSR-first**: Server-side rendering with EJS. HTMX for interactivity.
- **Security**: HttpOnly cookies, CSRF, input validation, bcrypt for passwords.
- **Database**: Prisma with SQLite (WAL mode). Prepare for Postgres migration.

## Confirmed Model
- Multi-warehouse stock (StockLevel has warehouseId)
- Units: bottles + boxes (conversion factor in Product.bottlesPerBox)
- 2-3 price lists from start
- Price structure: basePrice + ivaPercent (separate fields)
- Product fields: SKU, name, company, presentation, vintage, varietal, imageUrl

## Code Style
- Use async/await (no callbacks)
- Validate all inputs with express-validator
- Separate business logic in /services
- Use Prisma transactions for stock adjustments
- EJS partials for reusable components

## What NOT to do
- Don't use React in R1 (only EJS + HTMX)
- Don't add features outside confirmed scope
- Don't skip CSRF protection
- Don't use ORMs other than Prisma
