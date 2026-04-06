# Prompt: Página Dedicada de Biblioteca de Mídia

Você é um engenheiro sênior TypeScript. Antes de qualquer ação, leia: CLAUDE.md, arquitetura.md, banco.md.

Implemente a feature de Página Dedicada de Biblioteca de Mídia em 4 fases sequenciais. Explique o que será criado antes de cada fase.

---

## FASE 1 — Backend: campo isActive + endpoint toggle

### 1.1 — Adicionar `isActive` ao modelo `CompanyMedia` em `backend/prisma/schema.prisma`

```prisma
model CompanyMedia {
  // ... campos existentes ...
  isActive    Boolean   @default(true)   // ← adicionar após aiAnalyzed
  // ...
}
```

### 1.2 — Criar e aplicar migration

```bash
cd backend
npx prisma migrate dev --name add_company_media_isactive
npx prisma generate
```

### 1.3 — Atualizar `selectMediaForPost()` em `backend/src/services/media.service.ts`

Adicionar `isActive: true` ao filtro em AMBOS os caminhos (categoria preferida e fallback):

```typescript
// categoria preferida
where: { companyId, aiAnalyzed: true, isActive: true, category: preferredCategory }

// fallback
where: { companyId, aiAnalyzed: true, isActive: true, type: MediaType.IMAGE }
```

### 1.4 — Adicionar `toggleCompanyMediaActive()` em `backend/src/services/media.service.ts`

```typescript
export async function toggleCompanyMediaActive(
  prisma: PrismaClient,
  mediaId: string,
  userId: string,
  isActive: boolean,
): Promise<CompanyMedia>;
```

- Buscar mídia com `include: { company: { select: { userId: true } } }`
- Se não encontrado: throw 404
- Se `media.company.userId !== userId`: throw 403
- `prisma.companyMedia.update({ where: { id: mediaId }, data: { isActive } })`
- Retornar o registro atualizado (sem o campo `company` incluído — usar destructuring igual ao `getCompanyMediaById` existente)

### 1.5 — Adicionar método `toggleMedia()` em `backend/src/controllers/media.controller.ts`

```typescript
async toggleMedia(request: FastifyRequest, reply: FastifyReply)
```

- Validar body com Zod: `z.object({ isActive: z.boolean() })`
- Se inválido: 400
- Extrair `mediaId` de `request.params`
- Chamar `toggleCompanyMediaActive()`
- Retornar 200 com o objeto atualizado
- Tratar erros com `statusCode` igual aos outros métodos

### 1.6 — Registrar rota em `backend/src/routes/media.routes.ts`

```
PATCH /companies/:companyId/media/:mediaId → toggleMedia
```

Protegida por `authMiddleware`, junto com as demais rotas existentes.

---

## FASE 2 — Frontend: hook e interface

### 2.1 — Atualizar interface `CompanyMedia` em `frontend/src/hooks/useMedia.ts`

Adicionar campo:

```typescript
isActive: boolean;
```

### 2.2 — Adicionar `useToggleMedia(companyId)` em `frontend/src/hooks/useMedia.ts`

```typescript
export function useToggleMedia(companyId: string);
```

- `useMutation` que chama `PATCH /companies/${companyId}/media/${mediaId}` com `{ isActive }`
- `mutationFn` recebe `{ mediaId: string; isActive: boolean }`
- `onSuccess`: `queryClient.invalidateQueries({ queryKey: ["media", companyId] })`

---

## FASE 3 — Nova página: `frontend/src/pages/media/MediaLibraryPage.tsx`

Criar do zero seguindo os padrões visuais das outras páginas (ver `ContentPage.tsx` e `SettingsPage.tsx` como referência de layout, card e tipografia).

### Estrutura da página:

**Header:**

- Título "Biblioteca de Mídia" + subtítulo "Gerencie as mídias da sua empresa"
- Botão "Adicionar mídia" que expande/colapsa o `MediaUploader`

**Filtros (abaixo do header):**

- Select de tipo: Todos / Imagem / Vídeo / Logo (filtra pelo campo `type`)
- Select de status: Todas / Ativas / Inativas (filtra por `isActive`)
- Ambos os filtros são locais (filtram o array já carregado — não fazem nova requisição)

**Grid de cards (3 colunas no desktop, 2 no mobile):**

Cada card exibe:

- Preview: `<img>` para imagens/logo, `<video muted>` para vídeo
- Se `!media.isActive`: opacidade reduzida (`opacity-50`) + badge "Inativa" em cinza
- Se `media.isActive` e `!media.aiAnalyzed`: badge amarelo "Analisando…" com spinner
- Se `media.isActive` e `media.aiAnalyzed`: badge verde com `media.category`
- Tags como chips (máx 4, com "..." se houver mais)
- `media.description` em texto pequeno truncado (1 linha)
- Rodapé do card com dois botões de ação:
  - Toggle ativo/inativo: ícone `Eye` (ativo) ou `EyeOff` (inativo) — ao clicar, chama `useToggleMedia`
  - Deletar: ícone `Trash2` — ao clicar, chama `useDeleteMedia` com confirmação via `window.confirm`

**Estado vazio (sem mídias):**

- Ícone grande, texto "Nenhuma mídia ainda" e botão para abrir o uploader

**Loading state:** spinner centralizado enquanto `isLoading`

**Uploader:**

- Usar o componente `MediaUploader` existente de `@/components/ui/MediaUploader`
- Após upload bem-sucedido, fechar o uploader e a lista atualiza automaticamente via TanStack Query

### Hooks usados:

- `useCompanyMedia(companyId)` — listar todas as mídias (sem filtro de backend)
- `useUploadMedia(companyId)` — upload
- `useDeleteMedia(companyId)` — deletar
- `useToggleMedia(companyId)` — ativar/inativar
- `useMyProfile()` — obter `companyId`

---

## FASE 4 — Navegação e limpeza

### 4.1 — Registrar rota em `frontend/src/App.tsx`

```tsx
import { MediaLibraryPage } from "@/pages/media/MediaLibraryPage";

// Adicionar dentro das <Routes>:
<Route
  path="/media"
  element={
    <PrivateLayout>
      <MediaLibraryPage />
    </PrivateLayout>
  }
/>;
```

### 4.2 — Adicionar item ao Sidebar em `frontend/src/components/dashboard/Sidebar.tsx`

Adicionar entre "Conteúdo" e "Configurações":

```typescript
import { Images } from "lucide-react";

// Em navItems:
{ to: "/media", icon: Images, label: "Biblioteca" },
```

### 4.3 — Remover seção de mídia de `frontend/src/pages/settings/SettingsPage.tsx`

Remover:

- O componente `MediaLibraryCard` e sua função inteira
- As importações de `useCompanyMedia`, `useUploadMedia`, `useDeleteMedia`, `type CompanyMedia`
- O import de `MediaUploader`
- Os ícones `ImageIcon`, `Trash2`, `Tag` (apenas se não usados em outro lugar da página)
- Os blocos `{companyId && (<MediaLibraryCard ... />)}` no JSX da page

Manter inalterados: `ProfileCard`, `PasswordCard`, `BrandingCard` e todas as suas importações.

---

## RESTRIÇÕES

- Não alterar nenhum endpoint, service ou worker existente além do especificado
- O campo `isActive` não deve afetar o endpoint de listagem — retornar todas as mídias (ativas e inativas) para que o usuário possa reativar
- `selectMediaForPost()` é a única função de seleção de mídia para posts — é nela que `isActive: true` deve ser filtrado
- Seguir o padrão visual existente: fundo `bg-background`, cards `bg-surface`, bordas `border-border`, texto `text-foreground` / `text-muted-foreground`, primary `text-primary`
- O `window.confirm` antes de deletar é suficiente — não implementar modal customizado
