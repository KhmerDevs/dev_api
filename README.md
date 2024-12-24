# Dev API

A NestJS-based API project with PostgreSQL integration.

## Prerequisites

- Node.js (v12 or higher)
- Docker and Docker Compose
- npm or yarn

## Environment Setup

1. Create a `.env` file in the root directory based on `.env.sample`:
```bash
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=dev_db
```

## Installation

```bash
$ npm install
```

## Database Setup

Start the PostgreSQL database using Docker:

```bash
$ docker-compose up -d
```

This will create a PostgreSQL container with the following configuration:
- Port: 5001 (mapped to 5432 inside container)
- Username: postgres
- Password: postgres
- Database: dev_db

## Running the Application

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Project Structure

```
src/
├── config/
│   └── database.config.ts    # Database configuration
├── app.controller.ts         # Main application controller
├── app.module.ts            # Main application module
├── app.service.ts           # Application service
└── main.ts                  # Application entry point
```

## Features

- NestJS framework with TypeScript
- PostgreSQL database integration using TypeORM
- Docker containerization for database
- Environment configuration
- Static file serving
- Basic HTML landing page
- Unit and E2E testing setup

## Development Notes

- The application uses TypeORM for database operations
- Synchronize is enabled in development (`synchronize: true` in database config)
- Static assets are served from the root directory
- The default route serves an index.html page

## Important Configuration Files

- `docker-compose.yml` - Docker configuration for PostgreSQL
- `src/config/database.config.ts` - TypeORM configuration
- `.env` - Environment variables (create from .env.sample)
- `nest-cli.json` - NestJS CLI configuration

## License

This project is [MIT licensed](LICENSE).
