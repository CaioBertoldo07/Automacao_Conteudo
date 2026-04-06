---
name: prisma-migration
description: "Criar ou alterar modelos no banco de dados deste projeto. Use quando: novo modelo, nova coluna, novo relacionamento, novo enum, criar migration Prisma, alterar schema.prisma, adicionar índice, modificar tabela existente."
---

# Prisma Migration

Adiciona ou modifica modelos no banco PostgreSQL seguindo as convenções obrigatórias
do `backend/prisma/schema.prisma` deste projeto.

## Quando usar

- Novo modelo (tabela)
- Nova coluna em modelo existente
- Novo relacionamento entre modelos
- Novo valor em enum
- Novo índice para otimizar queries

## Schema em `backend/prisma/schema.prisma`

### Convenções obrigatórias

**IDs sempre UUID:**

```prisma
id String @id @default(uuid())
```

**Timestamps em todo modelo:**

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

**Relacionamentos sempre com `onDelete: Cascade`** quando o filho não faz sentido sem o pai:

```prisma
companyId String
company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
```

**Enums para status e tipos tipados** (nunca string livre para estados finitos):

```prisma
enum <Nome>Status {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

**Índices em colunas de filtro frequente:**

```prisma
@@index([companyId])
@@index([companyId, category])  // índice composto para filtros combinados
```

### Enums existentes (reutilizar, não duplicar)

```prisma
enum JobStatus          { PENDING, PROCESSING, DONE, FAILED }
enum ContentType        { IMAGE, REEL, STORY }
enum MediaType          { IMAGE, VIDEO, LOGO }
enum StrategyApprovalStatus { PENDING_APPROVAL, APPROVED, REJECTED }
```

### Template de novo modelo

```prisma
model <NomeModelo> {
  id        String   @id @default(uuid())
  // --- campos obrigatórios do domínio ---
  name      String
  status    JobStatus @default(PENDING)
  metadata  Json?    // dados flexíveis: usar Json?, não String serializado
  // --- timestamps ---
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // --- relacionamentos ---
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // --- índices ---
  @@index([companyId])
}
```

### Adicionar ao modelo Company

Todo modelo vinculado a uma empresa deve ter a relação inversa declarada em `Company`:

```prisma
model Company {
  // ...campos existentes...
  <nomeModelos> <NomeModelo>[]
}
```

## Procedimento completo

### 1. Editar o schema

Editar `backend/prisma/schema.prisma` com o novo modelo/campo seguindo as convenções acima.

### 2. Criar e aplicar a migration

```bash
cd backend
npx prisma migrate dev --name <descricao_curta>
```

Convenção de nomes para `--name`:

- `add_<modelo>` — novo modelo
- `add_<campo>_to_<modelo>` — novo campo
- `add_<nome>_index` — novo índice

### 3. Regenerar o Prisma Client

```bash
npx prisma generate
```

(Executado automaticamente pelo `migrate dev`, mas necessário em CI/CD.)

### 4. Atualizar types TypeScript

Se o modelo for exposto via API, criar/atualizar a interface correspondente no service:

```typescript
// services/<recurso>.service.ts
export interface <Recurso>Response {
  id: string;
  // campos que o frontend vai receber (nunca expor campos sensíveis)
  createdAt: Date;
}
```

## Checklist final

- [ ] ID `String @id @default(uuid())`
- [ ] `createdAt` + `updatedAt` presentes
- [ ] `onDelete: Cascade` em todos os `@relation` de dependentes
- [ ] Enums existentes reutilizados (não criar duplicatas)
- [ ] `@@index` nas colunas de filtro (`companyId`, combinações frequentes)
- [ ] Relação inversa adicionada ao modelo pai (ex: `Company`)
- [ ] `prisma migrate dev --name <descricao>` executado
- [ ] Interface TypeScript de response criada no service

## Campos sensíveis

Nunca retornar nas respostas da API:

- `password` (campo de `User`)
- Tokens ou chaves internas

Usar `select` explícito no Prisma ou mapear para interface de response.
