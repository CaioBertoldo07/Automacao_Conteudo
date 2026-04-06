---
name: prisma-migration
description: "Criar ou alterar modelos no banco de dados deste projeto. Use quando: novo modelo, nova coluna, novo relacionamento, novo enum, criar migration Prisma, alterar schema.prisma, adicionar índice, modificar tabela existente."
---

# Prisma Migration

Adiciona ou modifica modelos em `backend/prisma/schema.prisma` seguindo as convenções deste projeto.

## Quando usar

- Novo modelo (tabela)
- Nova coluna em modelo existente
- Novo relacionamento
- Novo enum ou valor de enum
- Novo índice

## Convenções obrigatórias

**IDs sempre UUID:**
```prisma
id String @id @default(uuid())
```

**Timestamps em todo modelo:**
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

**`onDelete: Cascade` em relacionamentos de dependência:**
```prisma
companyId String
company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
```

**Enums para estados finitos:**
```prisma
enum <Nome>Status {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

**Índices em colunas de filtro:**
```prisma
@@index([companyId])
@@index([companyId, category])
```

## Enums existentes (não duplicar)

```prisma
enum JobStatus               { PENDING, PROCESSING, DONE, FAILED }
enum ContentType             { IMAGE, REEL, STORY }
enum MediaType               { IMAGE, VIDEO, LOGO }
enum StrategyApprovalStatus  { PENDING_APPROVAL, APPROVED, REJECTED }
```

## Template de novo modelo

```prisma
model <NomeModelo> {
  id        String    @id @default(uuid())
  name      String
  status    JobStatus @default(PENDING)
  metadata  Json?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
}
```

Adicionar relação inversa em `Company`:
```prisma
<nomeModelos> <NomeModelo>[]
```

## Procedimento

```bash
cd backend
npx prisma migrate dev --name <descricao_curta>
```

Convenção de nomes:
- `add_<modelo>` — novo modelo
- `add_<campo>_to_<modelo>` — novo campo
- `add_<nome>_index` — novo índice

## Campos sensíveis

Nunca retornar nas respostas da API:
- `password` (campo de `User`)

Usar `select` explícito ou mapear para interface de response no service.

## Checklist final

- [ ] ID `String @id @default(uuid())`
- [ ] `createdAt` + `updatedAt` presentes
- [ ] `onDelete: Cascade` em relações de dependência
- [ ] Enums existentes reutilizados
- [ ] `@@index` nas colunas de filtro
- [ ] Relação inversa no modelo pai
- [ ] `prisma migrate dev --name <descricao>` executado
- [ ] Interface de response criada no service
