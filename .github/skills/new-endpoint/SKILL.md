---
name: new-endpoint
description: "Criar novo endpoint REST neste projeto. Use quando: adicionar rota, criar CRUD, novo recurso de API, novo controller, novo service, adicionar handler HTTP. Segue o padrão route → controller → service com Zod e Prisma."
---

# New Endpoint

Cria um recurso de API completo seguindo o padrão obrigatório deste projeto:
**route → controller → service**. Nunca colocar lógica de negócio nas rotas.

## Quando usar

- Adicionar nova rota HTTP (GET, POST, PUT, PATCH, DELETE)
- Criar um novo recurso (CRUD ou parcial)
- Adicionar endpoints a um recurso existente

## Estrutura obrigatória

```
backend/src/
  routes/<recurso>.routes.ts       ← recebe req, delega ao controller
  controllers/<recurso>.controller.ts  ← valida com Zod, chama service
  services/<recurso>.service.ts    ← lógica de negócio + Prisma
```

## Procedimento

### 1. Route (`routes/<recurso>.routes.ts`)

```typescript
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { make<Recurso>Controller } from "../controllers/<recurso>.controller";

export async function <recurso>Routes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const controller = make<Recurso>Controller(options.prisma);

  fastify.post("/<recurso>", controller.createHandler.bind(controller));
  fastify.get("/<recurso>", controller.listHandler.bind(controller));
  fastify.get("/<recurso>/:id", controller.getHandler.bind(controller));
  fastify.put("/<recurso>/:id", controller.updateHandler.bind(controller));
  fastify.delete("/<recurso>/:id", controller.deleteHandler.bind(controller));
}
```

Rotas que exigem autenticação usam o middleware:

```typescript
fastify.post(
  "/<recurso>",
  { preHandler: [authMiddleware] },
  controller.createHandler.bind(controller),
);
```

### 2. Controller (`controllers/<recurso>.controller.ts`)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { create<Recurso>, list<Recurso> } from "../services/<recurso>.service";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório."),
  // ... outros campos tipados
});

export function make<Recurso>Controller(prisma: PrismaClient) {
  return {
    async createHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const result = await create<Recurso>(prisma, body.data, request.user.id);
        return reply.status(201).send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply
          .status(e.statusCode ?? 500)
          .send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
```

**Regras do controller:**

- Sempre usar `schema.safeParse(request.body)` — nunca `parse()`
- Retornar sempre `body.error.errors[0].message` (primeiro erro)
- Bloco `try/catch` padrão em **todos** os handlers
- `request.user.id` disponível após `authMiddleware` (via `types/fastify.d.ts`)

### 3. Service (`services/<recurso>.service.ts`)

```typescript
import { PrismaClient } from "@prisma/client";

export interface Create<Recurso>Input {
  name: string;
  // ... campos tipados explicitamente
}

export async function create<Recurso>(
  prisma: PrismaClient,
  data: Create<Recurso>Input,
  userId: string
) {
  // Verificação de conflito:
  const existing = await prisma.<modelo>.findFirst({
    where: { name: data.name, userId },
  });
  if (existing) {
    throw { statusCode: 409, message: "<Recurso> já existe." };
  }

  return prisma.<modelo>.create({ data: { ...data, userId } });
}

export async function get<Recurso>ByIdForUser(
  prisma: PrismaClient,
  id: string,
  userId: string
) {
  const record = await prisma.<modelo>.findFirst({ where: { id, userId } });
  if (!record) {
    throw { statusCode: 404, message: "<Recurso> não encontrado." };
  }
  return record;
}
```

**Regras do service:**

- Verificar ownership (`userId`) em todos os acessos por ID
- Lançar erros como **objetos literais** `{ statusCode, message }` — nunca `new Error()`
- Exportar **interfaces explícitas** para inputs e outputs
- Nunca importar Fastify aqui

### 4. Registrar no app.ts

Adicionar em `backend/src/app.ts`:

```typescript
import { <recurso>Routes } from "./routes/<recurso>.routes";
// ...dentro de buildApp():
fastify.register(<recurso>Routes, { prefix: "/api", prisma });
```

## Convenções de status HTTP

| Situação                     | Status |
| ---------------------------- | ------ |
| Criação bem-sucedida         | 201    |
| Sucesso geral                | 200    |
| Dados inválidos (Zod)        | 400    |
| Não autenticado              | 401    |
| Sem permissão                | 403    |
| Não encontrado               | 404    |
| Conflito / duplicado         | 409    |
| Erro de IA externo           | 502    |
| Serviço externo indisponível | 503    |
| Erro interno                 | 500    |

## Checklist final

- [ ] Route: apenas registra handlers, sem lógica
- [ ] Controller: Zod `safeParse` + `try/catch` em cada handler
- [ ] Service: ownership check, interfaces exportadas, erros como objetos literais
- [ ] Rota registrada em `app.ts`
- [ ] Sem `any` no TypeScript
