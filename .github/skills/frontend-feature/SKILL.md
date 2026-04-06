---
name: frontend-feature
description: "Criar nova feature ou página no frontend deste projeto. Use quando: nova página, novo hook, nova chamada de API no frontend, novo componente de feature, integrar endpoint com React, adicionar rota no frontend, criar formulário, listar dados."
---

# Frontend Feature

Cria uma feature completa no frontend seguindo o padrão estabelecido:
**página → hook (TanStack Query) → service (api.ts) → type**.

## Quando usar

- Nova página (ex: `/settings/notifications`, `/analytics`)
- Novo hook de dados (`useQuery` ou `useMutation`)
- Integrar novo endpoint de backend com o frontend
- Novo componente de feature (não primitivo de UI)

## Estrutura obrigatória

```
frontend/src/
  pages/<recurso>/          ← componente(s) da página
  hooks/use<Recurso>.ts     ← TanStack Query (queries + mutations)
  services/api.ts           ← chamadas Axios tipadas (adicionar ao arquivo existente)
  types/index.ts            ← interfaces de response (adicionar ao arquivo existente)
```

## Procedimento

### 1. Adicionar tipos em `types/index.ts`

```typescript
// Sempre criar interfaces explícitas — nunca usar `any`
export interface <Recurso> {
  id: string;
  name: string;
  // ... campos conforme o contrato da API
  createdAt: string;  // datas chegam como string ISO do JSON
  updatedAt: string;
}

export interface Create<Recurso>Request {
  name: string;
  // ... campos do form
}
```

### 2. Adicionar service em `services/api.ts`

O arquivo `api.ts` exporta um `axios` configurado com:

- `baseURL: "/api"`
- Interceptor que injeta `Authorization: Bearer <token>` do `localStorage`
- Interceptor de response que redireciona para `/login` em caso de `401`

**Adicionar ao final do arquivo:**

```typescript
export const <recurso>Service = {
  list: async (): Promise<<Recurso>[]> => {
    const response = await api.get<<Recurso>[]>("/<recurso>s");
    return response.data;
  },

  get: async (id: string): Promise<<Recurso>> => {
    const response = await api.get<<Recurso>>("/<recurso>s/" + id);
    return response.data;
  },

  create: async (data: Create<Recurso>Request): Promise<<Recurso>> => {
    const response = await api.post<<Recurso>>("/<recurso>s", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Create<Recurso>Request>): Promise<<Recurso>> => {
    const response = await api.put<<Recurso>>("/<recurso>s/" + id, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete("/<recurso>s/" + id);
  },
};
```

### 3. Criar o hook em `hooks/use<Recurso>.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { <recurso>Service } from "@/services/api";
import type { <Recurso>, Create<Recurso>Request } from "@/types";

// Chaves de cache centralizadas — facilita invalidação
export const <RECURSO>_KEYS = {
  all:    ["<recurso>s"]               as const,
  single: (id: string) => ["<recurso>s", id] as const,
};

export function use<Recurso>s() {
  return useQuery({
    queryKey: <RECURSO>_KEYS.all,
    queryFn:  () => <recurso>Service.list(),
    staleTime: 1000 * 60,  // 1 min — ajustar conforme volatilidade dos dados
  });
}

export function use<Recurso>(id: string) {
  return useQuery({
    queryKey: <RECURSO>_KEYS.single(id),
    queryFn:  () => <recurso>Service.get(id),
    enabled:  !!id,
    staleTime: 1000 * 60,
  });
}

export function useCreate<Recurso>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Create<Recurso>Request) => <recurso>Service.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: <RECURSO>_KEYS.all });
    },
  });
}

export function useDelete<Recurso>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => <recurso>Service.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: <RECURSO>_KEYS.all });
    },
  });
}
```

**Padrões de polling (quando dado é gerado de forma assíncrona):**

```typescript
// Poll rápido enquanto há itens pendentes, lento quando idle
refetchInterval: (query) => {
  const data = query.state.data;
  if (!data) return 20_000;
  return data.some((item) => item.status === "PENDING" || item.status === "PROCESSING")
    ? 5_000    // 5s durante processamento
    : 20_000;  // 20s idle
},
```

### 4. Criar a página em `pages/<recurso>/`

```
pages/<recurso>/
  index.tsx          ← arquivo principal da página
  components/        ← componentes específicos desta página (opcional)
```

```tsx
// pages/<recurso>/index.tsx
import { use<Recurso>s } from "@/hooks/use<Recurso>";

export default function <Recurso>Page() {
  const { data, isLoading, error } = use<Recurso>s();

  if (isLoading) return <div>Carregando...</div>;
  if (error)     return <div>Erro ao carregar dados.</div>;

  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### 5. Registrar a rota em `App.tsx`

```tsx
import <Recurso>Page from "@/pages/<recurso>";

// Dentro do <Routes>:
<Route path="/<recurso>" element={<PrivateRoute><Recurso>Page /></PrivateRoute>} />
```

## Componentes disponíveis (Radix UI + shadcn)

Reutilizar componentes existentes em `components/ui/`:

- `Button`, `Input`, `Select`, `Badge`, `Card`, `Dialog`, `Skeleton`, etc.
- **Não criar wrappers** para componentes de UI que já existam

## Convenções

| Aspecto        | Convenção                                                       |
| -------------- | --------------------------------------------------------------- |
| Datas da API   | `string` (ISO 8601) — converter com `new Date()` só na exibição |
| Erros Axios    | Tratar via `error.response?.data?.error`                        |
| Loading states | Sempre mostrar feedback visual (`isLoading`, `isPending`)       |
| `staleTime`    | Mínimo 30s para dados raramente alterados, 0 para tempo real    |
| Imports        | Usar alias `@/` (configurado no `tsconfig.json`)                |

## Checklist final

- [ ] Interface de tipo adicionada a `types/index.ts` (sem `any`)
- [ ] Service adicionado a `services/api.ts` com tipagem completa
- [ ] Hook em `hooks/use<Recurso>.ts` com query keys centralizadas
- [ ] `staleTime` e `refetchInterval` ajustados para o caso de uso
- [ ] `onSuccess` invalida as query keys corretas
- [ ] Página em `pages/<recurso>/index.tsx`
- [ ] Rota registrada em `App.tsx`
- [ ] Estados de loading e erro tratados na UI
