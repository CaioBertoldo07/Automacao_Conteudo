# Banco de Dados — Prisma Schema

## Banco

PostgreSQL

---

# Modelos principais

## User

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())

  companies Company[]
}
```

---

## Company

Empresa cadastrada no sistema.

```prisma
model Company {
  id          String   @id @default(uuid())
  name        String
  niche       String
  description String
  city        String
  tone        String
  createdAt   DateTime @default(now())

  userId String
  user   User @relation(fields: [userId], references: [id])

  posts     Post[]
  calendars ContentCalendar[]
}
```

---

## ContentCalendar

Agenda de posts.

```prisma
model ContentCalendar {
  id        String   @id @default(uuid())
  companyId String
  date      DateTime
  type      ContentType
  status    JobStatus

  company Company @relation(fields: [companyId], references: [id])
}
```

---

## Post

Conteúdo gerado.

```prisma
model Post {
  id        String   @id @default(uuid())
  companyId String
  type      ContentType
  caption   String
  mediaUrl  String?
  status    JobStatus
  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])
}
```

---

## AIJob

Controle de geração.

```prisma
model AIJob {
  id        String   @id @default(uuid())
  type      String
  status    JobStatus
  payload   Json
  result    Json?
  createdAt DateTime @default(now())
}
```

---

# Enums

```prisma
enum ContentType {
  IMAGE
  REEL
  STORY
}
```

```prisma
enum JobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

---

# Relações

User
→ Companies

Company
→ Posts
→ ContentCalendar

Posts
→ conteúdo gerado por IA

AIJobs
→ controle de filas
