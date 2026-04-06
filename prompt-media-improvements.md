# Prompt: Melhorias na Biblioteca de Mídia

Você é um engenheiro sênior TypeScript. Antes de qualquer ação, leia: CLAUDE.md, arquitetura.md.

Existem 3 melhorias pendentes na feature de Biblioteca de Mídia. Implemente-as em ordem.

---

## MELHORIA 1 — selectMediaForPost: evitar repetição da mesma mídia

Arquivo: `backend/src/services/media.service.ts`

**Problema:** `selectMediaForPost()` sempre retorna `findFirst` com `orderBy: createdAt desc`,
o que garante que a mesma mídia será selecionada repetidamente em lotes.

**Solução:** Implementar seleção aleatória entre as mídias analisadas disponíveis.

Alterar a função para:

1. Buscar TODAS as mídias com `aiAnalyzed: true` que correspondam ao critério (categoria preferida ou tipo IMAGE)
2. Se encontrar resultados, selecionar aleatoriamente uma delas com `Math.floor(Math.random() * results.length)`
3. Retornar o item selecionado ou `null` se vazio

A assinatura da função permanece idêntica — apenas a lógica interna muda.

---

## MELHORIA 2 — Endpoint GET individual de mídia

**Problema:** Não existe rota `GET /companies/:companyId/media/:mediaId` para busca individual.

Isso é necessário para o frontend verificar o status de análise de uma mídia específica
sem recarregar toda a lista (polling após upload).

### 2.1 — Adicionar `getCompanyMediaById()` em `backend/src/services/media.service.ts`

```typescript
export async function getCompanyMediaById(
  prisma: PrismaClient,
  mediaId: string,
  userId: string,
): Promise<CompanyMedia>;
```

- Buscar `CompanyMedia` com `include: { company: true }`
- Se não encontrado: throw 404
- Se `media.company.userId !== userId`: throw 403
- Retornar o registro

### 2.2 — Adicionar `getMedia()` em `backend/src/controllers/media.controller.ts`

```typescript
async getMedia(request: FastifyRequest, reply: FastifyReply)
```

- Extrair `mediaId` de `request.params`
- Chamar `getCompanyMediaById()`
- Retornar 200 com o objeto ou repassar erro com `statusCode`

### 2.3 — Registrar a rota em `backend/src/routes/media.routes.ts`

```
GET /companies/:companyId/media/:mediaId → getMedia
```

Protegida por `auth.middleware.ts`, igual às outras rotas do mesmo arquivo.

### 2.4 — Adicionar `useGetMedia()` em `frontend/src/hooks/useMedia.ts`

```typescript
export function useGetMedia(companyId: string, mediaId: string | null);
```

- TanStack Query com `queryKey: ["media", companyId, mediaId]`
- `enabled: !!companyId && !!mediaId`
- `refetchInterval: (data) => data?.aiAnalyzed ? false : 3000`
  — faz polling a cada 3s enquanto `aiAnalyzed` for false, para o frontend saber quando a análise terminou
- Endpoint: `GET /companies/${companyId}/media/${mediaId}`

---

## MELHORIA 3 — Upload de logo via arquivo (não URL) no BrandingCard

Arquivo: `frontend/src/pages/settings/SettingsPage.tsx`

**Problema:** O campo `logoUrl` no `BrandingCard` é um input de texto com URL. Isso é
inconsistente com a biblioteca de mídia e obriga o usuário a hospedar o logo externamente.

**Solução:** Substituir o `Input` de `logoUrl` por um upload de arquivo que usa a própria
biblioteca de mídia da empresa.

### 3.1 — Alterar `BrandingCard`

1. Remover o campo `Input id="bp-logo"` (input de texto para URL)
2. Remover o estado `logoUrl` e `setLogoUrl`
3. Adicionar um `MediaUploader` restrito a imagens com `accept="image/jpeg,image/png,image/webp"`
4. No `onUpload`, chamar `useUploadMedia(companyId)` — o upload já salva a mídia na biblioteca
5. Após upload bem-sucedido, chamar `updateBrand.mutateAsync({ logoUrl: media.url })` para
   persistir a URL no `BrandProfile`
6. Exibir o logo atual (se `bp?.logoUrl` existir) como preview com `<img>` antes do uploader,
   com um badge "Logo atual"

### 3.2 — Ajustar o hook `useUploadMedia` em `frontend/src/hooks/useMedia.ts`

A mutation atual não retorna o objeto criado de forma acessível ao BrandingCard.
Verificar que o retorno da `mutationFn` já inclui o `CompanyMedia` com a `url`
(se sim, nenhuma mudança necessária).

---

## RESTRIÇÕES

- Não alterar nenhuma outra funcionalidade além do especificado
- Não quebrar os testes ou comportamentos existentes dos endpoints já funcionando
- Seguir o mesmo padrão de tratamento de erro dos outros métodos do controller/service
- O `BrandProfile.logoUrl` deve continuar sendo atualizado via `PATCH /companies/:companyId/brand-profile`
  — o upload apenas obtém a URL e a passa para esse endpoint existente
