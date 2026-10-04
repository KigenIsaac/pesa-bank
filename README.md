# Pesa Bank

Pesa Bank is a modular banking platform built with a Spring Boot backend and a Next.js frontend. The project includes customer banking flows, teller operations, admin management, KYC, support tickets, notifications, and a JWT-based security layer.

## Overview

This repository contains the codebase for a kenyan local digital banking application prototype with:

- Customer account and transaction management
- Teller deposit, withdrawal, and transfer workflows
- Admin dashboards and compliance oversight
- KYC review flows
- Support ticket handling
- Notification support
- Role-based authentication and authorization
- PostgreSQL persistence with Flyway migrations

## Tech Stack

### Backend
- Java 21
- Spring Boot 3.3.x
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway
- JWT authentication

### Frontend
- Next.js 14
- React 18
- TypeScript
- App Router

## Project Structure

```text
/backend
/frontend
.gitignore
README.md
```

## Prerequisites

Before running the project, make sure you have:

- Java 21+
- Maven 3.9+
- Node.js 20+
- npm
- PostgreSQL 14+

## Environment Variables

The backend expects the following environment variables to be available before startup:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pesabank
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secure_secret
JWT_EXPIRATION_MINUTES=480
CORS_ORIGINS=http://localhost:3000
SEED_ENABLED=true
```

You can place these in your shell environment or in a `.env` file if your local environment supports it.

## Run the Backend

From the project root:

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will start on the default Spring Boot port, usually:

- http://localhost:8080

## Run the Frontend

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on:

- http://localhost:3000

## Database

The project is configured to use PostgreSQL. Flyway migration scripts are located in:

```text
backend/src/main/resources/db/migration/
```

Make sure the database exists and is reachable using the variables configured above.

## Features

### Customer Module
- Account lookup
- Statements
- Transfers
- Payment flows
- Profile management

### Teller Module
- Deposit workflows
- Withdrawal workflows
- Reversals
- Till management
- EOD reporting

### Admin Module
- User management
- Audit access
- Reports
- Compliance management
- Reversals and settings

### KYC Module
- KYC submission and review
- Decision handling
- Status tracking

### Support and Notifications
- Support tickets
- Message threads
- Notification delivery

## Notes

This project is structured as a banking prototype and is best suited for learning, mock development, and demonstration work. It is not a production-ready implementation without additional hardening, security reviews, and operational setup.

## License

This project is currently intended for local development.
