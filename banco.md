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

  companies Company[]
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
}
```

---

## BrandProfile

Perfil de marca detalhado da empresa (1:1 com Company).

```prisma
model BrandProfile {
  id                 String   @id @default(uuid())
  description        String
  targetAudience     String
  mainProducts       String
  communicationStyle String
  logoUrl            String?
  brandColors        String[]
  visualStyle        String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  companyId String  @unique
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

---

## ContentStrategy

Estratégia de conteúdo gerada pelo Gemini (1:1 com Company).

```prisma
model ContentStrategy {
  id              String                 @id @default(uuid())
  content         Json
  approvalStatus  StrategyApprovalStatus @default(PENDING_APPROVAL)
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  companyId String  @unique
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

---

## ContentCalendar

Agenda de posts.

```prisma
model ContentCalendar {
  id            String      @id @default(uuid())
  date          DateTime
  type          ContentType
  status        JobStatus   @default(PENDING)
  postIdeaIndex Int?
  createdAt     DateTime    @default(now())

  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  post Post?
}
```

---

## Post

Conteúdo gerado.

```prisma
model Post {
  id          String      @id @default(uuid())
  type        ContentType
  caption     String?
  hashtags    String?
  mediaUrl    String?
  status      JobStatus   @default(PENDING)
  scheduledAt DateTime?
  publishedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  companyId  String
  company    Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  calendarId String?          @unique
  calendar   ContentCalendar? @relation(fields: [calendarId], references: [id])
}
```

---

## AIJob

Controle de geração de conteúdo.

```prisma
model AIJob {
  id        String    @id @default(uuid())
  type      String
  status    JobStatus @default(PENDING)
  payload   Json
  result    Json?
  error     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  companyId String?
  company   Company? @relation(fields: [companyId], references: [id])
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

enum JobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}

enum StrategyApprovalStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
}

enum MediaType {
  IMAGE
  VIDEO
  LOGO
}
```

---

## CompanyMedia

Mídias carregadas pela empresa. Analisadas automaticamente via Gemini após upload.

```prisma
model CompanyMedia {
  id          String    @id @default(uuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  type        MediaType           // IMAGE | VIDEO | LOGO (promovido se category = "logo")
  url         String              // caminho público: /media/company-media/<companyId>/<filename>
  filename    String
  mimeType    String
  category    String?             // produto | bastidores | loja | equipe | logo | outros
  tags        String[]
  description String?
  metadata    Json?               // detectedElements, dominantColors, suggestedUse
  aiAnalyzed  Boolean   @default(false)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([companyId])
  @@index([companyId, category])
}
```

---

# Relações

```
User
└── Company (1:N)
    ├── BrandProfile (1:1)
    ├── ContentStrategy (1:1)
    ├── ContentCalendar (1:N)
    │   └── Post (1:1)
    ├── Post (1:N)
    ├── AIJob (1:N)
    └── CompanyMedia (1:N)
```

Todos os filhos de Company têm `onDelete: Cascade` — deletar uma empresa remove todos os seus dados.
