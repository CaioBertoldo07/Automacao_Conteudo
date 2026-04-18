# Banco de Dados — Prisma Schema

## Banco

PostgreSQL

ORM: Prisma (`backend/prisma/schema.prisma`)

---

# Modelos

## User

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companies     Company[]
  notifications Notification[]
}
```

---

## Company

Empresa cadastrada no sistema.

```prisma
model Company {
  id               String   @id @default(uuid())
  name             String
  niche            String
  description      String
  city             String
  tone             String
  postingFrequency Int      @default(12)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  brandProfile    BrandProfile?
  contentStrategy ContentStrategy?
  posts           Post[]
  calendars       ContentCalendar[]
  aiJobs          AIJob[]
  media           CompanyMedia[]
  notifications   Notification[]
  automationConfig AutomationConfig?
}
```
