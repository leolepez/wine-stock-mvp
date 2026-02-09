# Wine Stock MVP

Internal stock & price management system for wine distributor.

## Tech Stack

- **Backend**: Node.js + Express
- **Views**: EJS + HTMX
- **Styling**: Tailwind CSS
- **Database**: Prisma + SQLite (production: PostgreSQL)
- **Security**: Helmet, CSRF, bcrypt

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Initialize database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Build CSS:
```bash
npm run build:css
```

5. Run development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run build:css` - Build Tailwind CSS once
- `npm run watch:css` - Watch and rebuild CSS on changes
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
wine-stock-mvp/
├── src/
│   ├── config/         # Database and session configuration
│   ├── middleware/     # Auth and validation middleware
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── styles/         # Tailwind input CSS
│   ├── views/          # EJS templates
│   └── index.js        # Application entry point
├── prisma/
│   └── schema.prisma   # Database schema
└── public/
    ├── css/            # Compiled CSS
    └── js/             # Client-side JavaScript
```

## Features

- Multi-warehouse stock management
- Bottle and box units with conversion
- Multiple price lists with base price + IVA
- User roles: ADMIN, MANAGER, VIEWER
- Movement tracking and audit trail
