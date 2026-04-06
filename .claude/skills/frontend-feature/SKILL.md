---
name: frontend-feature
description: "Criar nova feature ou página no frontend deste projeto. Use quando: nova página, novo hook, nova chamada de API no frontend, novo componente de feature, integrar endpoint com React, adicionar rota no frontend, criar formulário, listar dados."
---

# Frontend Feature

Cria uma feature completa no frontend seguindo o padrão:
**página → hook (TanStack Query) → service → type**.

## Quando usar

- Nova página
- Novo hook de dados (`useQuery` / `useMutation`)
- Integrar novo endpoint de backend
- Novo componente de feature

## Estrutura

```
frontend/src/
  pages/<recurso>/       ← componente(s) da página
  hooks/use<Recurso>.ts  ← TanStack Query
  services/api.ts        ← adicionar service ao arquivo existente
  types/index.ts         ← adicionar interfaces ao arquivo existente
```

## Procedimento

### 1. Tipos (`types/index.ts`)

```typescript
export interface <Recurso> {
  id: string;
  name: string;
  createdAt: string;  // datas chegam como string ISO
  updatedAt: string;
}

export interface Create<Recurso>Request {
  name: string;
}
```

### 2. Service (`services/api.ts`)

O `api` já é um axios com `baseURL: "/api"`, interceptor de token JWT e redirect para `/login` em 401.

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
  delete: async (id: string): Promise<void> => {
    await api.delete("/<recurso>s/" + id);
  },
};
```

### 3. Hook (`hooks/use<Recurso>.ts`)

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { <recurso>Service } from "@/services/api";

export const <RECURSO>_KEYS = {
  all:    ["<recurso>s"]               as const,
  single: (id: string) => ["<recurso>s", id] as const,
};

export function use<Recurso>s() {
  return useQuery({
    queryKey: <RECURSO>_KEYS.all,
    queryFn:  () => <recurso>Service.list(),
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
```

**Polling para dados assíncronos:**
```typescript
refetchInterval: (query) => {
  const data = query.state.data;
  if (!data) return 20_000;
  return data.some((item) => item.status === "PENDING" || item.status === "PROCESSING")
    ? 5_000   // 5s durante processamento
    : 20_000; // 20s idle
},
```

### 4. Página (`pages/<recurso>/index.tsx`)

```tsx
import { use<Recurso>s } from "@/hooks/use<Recurso>";

export default function <Recurso>Page() {
  const { data, isLoading, error } = use<Recurso>s();

  if (isLoading) return <div>Carregando...</div>;
  if (error)     return <div>Erro ao carregar dados.</div>;

  return <div>{/* renderização */}</div>;
}
```

### 5. Registrar rota em `App.tsx`

```tsx
import <Recurso>Page from "@/pages/<recurso>";

<Route path="/<recurso>" element={<PrivateRoute><Recurso>Page /></PrivateRoute>} />
```

## Convenções

| Aspecto | Convenção |
|---|---|
| Datas | `string` ISO — converter com `new Date()` só na exibição |
| Imports | Alias `@/` (configurado no `tsconfig.json`) |
| `staleTime` | Mínimo 30s para dados estáticos |
| `onSuccess` | Sempre invalidar query keys afetadas |

## Checklist final

- [ ] Interface em `types/index.ts` (sem `any`)
- [ ] Service em `services/api.ts` tipado
- [ ] Hook com query keys centralizadas
- [ ] `staleTime` e `refetchInterval` adequados
- [ ] Página em `pages/<recurso>/index.tsx`
- [ ] Rota em `App.tsx`
- [ ] Estados de loading e erro tratados
