# AUDITORIA TÉCNICA PROFUNDA — Automacao_Conteudo

Você é um arquiteto de software sênior especializado em sistemas SaaS, integração com IA e arquiteturas orientadas a eventos. Sua tarefa é conduzir uma auditoria técnica completa deste repositório.

---

## CONTEXTO DO PROJETO

Sistema SaaS de automação de conteúdo para Instagram para pequenos negócios brasileiros. Orquestra múltiplas IAs (Gemini, Veo) para gerar posts, imagens, vídeos e legendas automaticamente. Usa filas assíncronas para processamento pesado.

**Stack real (ignore os docs que dizem Python/FastAPI):**

- Backend: TypeScript + Fastify + Prisma ORM
- Database: PostgreSQL
- Queue: BullMQ + Redis
- AI: Google Gemini 2.5 Flash (texto/imagem) + Veo 3 (vídeo)
- Storage: local filesystem (uploads/)
- Frontend: React + Vite + TypeScript + TailwindCSS

---

## FASE 1 — LEITURA E COMPREENSÃO

Leia e compreenda completamente os seguintes arquivos antes de qualquer análise:

**Documentação:**

- planejamento.md
- arquitetura.md
- banco.md
- desenvolvimento.md
- CLAUDE.md

**Backend — Core:**

- backend/src/app.ts
- backend/src/server.ts
- backend/src/worker.ts
- backend/src/config/env.ts
- backend/src/config/redis.ts

**Backend — Prisma:**

- backend/prisma/schema.prisma
- backend/prisma/migrations/ (listar todos)

**Backend — Routes, Controllers, Services:**

- backend/src/routes/\*.ts (todos)
- backend/src/controllers/\*.ts (todos)
- backend/src/services/\*.ts (todos)

**Backend — Agents / AI:**

- backend/src/agents/claude.agent.ts
- backend/src/agents/content.agent.ts
- backend/src/agents/image.adapter.ts
- backend/src/agents/video.adapter.ts

**Backend — Queues / Workers:**

- backend/src/queues/content.queue.ts
- backend/src/workers/content.worker.ts

**Backend — Utils / Middleware:**

- backend/src/utils/jwt.ts
- backend/src/utils/password.ts
- backend/src/utils/storage.ts
- backend/src/middlewares/auth.middleware.ts
- backend/src/types/fastify.d.ts

**Frontend:**

- frontend/src/App.tsx
- frontend/src/services/api.ts
- frontend/src/types/index.ts
- frontend/src/hooks/\*.ts (todos)
- frontend/src/pages/\*_/_.tsx (todos)
- frontend/src/components/\*_/_.tsx (todos)

**Config:**

- docker-compose.yml
- backend/package.json
- frontend/package.json

---

## FASE 2 — AUDITORIA

Após ler todos os arquivos, produza um relatório estruturado cobrindo OBRIGATORIAMENTE cada seção abaixo. Para cada problema encontrado, forneça:

1. Localização exata (arquivo + linha quando possível)
2. Descrição do problema
3. Impacto (severidade: CRÍTICO / ALTO / MÉDIO / BAIXO)
4. Solução recomendada com código de exemplo quando aplicável

---

### SEÇÃO A — Arquitetura Geral

1. **Desalinhamento docs vs código:** A documentação descreve Python/FastAPI. O código é TypeScript/Fastify. Avalie o impacto e recomende como sincronizar.

2. **Estrutura de diretórios:** A estrutura atual segue os padrões do CLAUDE.md? O que está fora do lugar? O que está faltando?

3. **Separação de responsabilidades:** Routes → Controllers → Services → Agents. Existe lógica de negócio vazando para controllers ou routes? Existe lógica de IA em services em vez de agents?

4. **Acoplamento:** Quais módulos têm acoplamento excessivo? Quais dependências deveriam ser injeções?

5. **Coesão:** Algum service ou agent está fazendo responsabilidades demais?

---

### SEÇÃO B — Sistema de IA

1. **Nomenclatura dos agentes:** `claude.agent.ts` usa Google Gemini, não Claude/Anthropic. `ANTHROPIC_API_KEY` está configurada em env.ts mas nunca usada. Quais são os impactos?

2. **Ausência de abstração de provider:** Todos os agents hardcodeiam `GoogleGenerativeAI`. Proponha uma arquitetura de `AIProvider` interface com adaptadores concretos para Gemini, Claude (Anthropic), e futuramente OpenAI. Mostre o código da interface e de pelo menos um adaptador concreto.

3. **Código duplicado entre agents:** `extractJson()` aparece em `claude.agent.ts` e `content.agent.ts`. Onde deveria existir uma camada de utilitários compartilhados?

4. **Qualidade dos prompts:** Revise os prompts em `buildPrompt()`, `buildCaptionPrompt()`, `buildImagePrompt()`, `buildVideoPrompt()`. Avalie:
   - Clareza e especificidade das instruções
   - Ausência de exemplos few-shot
   - Falta de chain-of-thought
   - Instruções conflitantes (ex: "Responda APENAS com JSON" + o modelo ainda pode errar)
   - Estratégia de fallback ausente

   Sugira melhorias concretas para cada prompt.

5. **Parsing frágil de JSON:** `extractJson()` usa regex e indexOf. Com LLMs não-determinísticos, isso falha em production. Quais são alternativas mais robustas? (ex: `response_format` structured outputs, Zod com `safeParse`, retry com temperatura 0)

6. **Engenharia de prompt para custo:** Os prompts são longos e sem técnicas de compressão. Sugira como reduzir tokens sem perder qualidade de output.

---

### SEÇÃO C — Sistema de Filas e Workers

1. **Fila única para tudo:** Existe apenas `content-generation` queue misturando jobs de texto (~$0.0001), imagem (~$0.01) e vídeo (~$0.35+). Proponha uma arquitetura com filas separadas por custo/prioridade e explique como o BullMQ gerenciaria cada uma.

2. **Retries e custo:** `attempts: 3` sem distinção por tipo de job. Um vídeo Veo com falha transitória pode custar 3x. Proponha estratégias de retry diferenciadas por tipo de conteúdo.

3. **Timeout de jobs:** Não existe `timeout` configurado por job no BullMQ. Jobs de Veo que travam ficam em PROCESSING para sempre. Como configurar corretamente?

4. **Dead Letter Queue:** Sem DLQ explícito. Jobs que esgotam tentativas ficam no Redis sem tratamento especial. Como implementar DLQ com alertas?

5. **Worker isolation:** O worker cria seu próprio `PrismaClient`. Em múltiplas instâncias, isso exaure o pool de conexões do PostgreSQL. Qual é o padrão correto?

6. **Concorrência:** `concurrency: 3` hardcoded. Como tornar isso configurável por ambiente e tipo de job?

7. **Observabilidade do worker:** Apenas `console.log`. Como instrumentar com métricas (jobs/min, latência, taxa de erro) exportáveis para Prometheus/Grafana?

8. **Graceful shutdown:** O worker trata apenas `SIGTERM`. E `SIGINT`? E jobs parcialmente executados quando o processo morre?

---

### SEÇÃO D — Banco de Dados e Modelagem

1. **`postIdeaIndex` frágil:** `ContentCalendar.postIdeaIndex` é um índice inteiro apontando para posição em array JSON dentro de `ContentStrategy.content`. Se a estratégia for regenerada, os índices ficam inválidos. Proponha modelagem mais robusta com entidade `PostIdea` separada.

2. **`AIJob.companyId` nullable:** AIJobs sem `companyId` são órfãos impossíveis de auditar. Deve ser obrigatório? Quais impactos na migração?

3. **Ausência de paginação:** Services que listam calendários e posts retornam tudo sem `take`/`skip`. Proponha paginação cursor-based compatível com o frontend.

4. **Índices de performance:** Quais colunas deveriam ter índices que atualmente não têm? Analise queries em services e sugira índices específicos com `@@index` no schema Prisma.

5. **Multi-tenancy:** A autorização é feita manualmente em cada service (`company.userId !== userId`). É fácil esquecer uma verificação. Proponha um helper centralizado de authorization.

6. **Cascade delete:** Revise todos os `onDelete: Cascade`. Existe risco de deleção acidental em cascata que destruiria dados valiosos?

---

### SEÇÃO E — Segurança (OWASP Top 10)

1. **Autenticação:** Token JWT sem refresh tokens e sem revogação. Um token roubado é válido 24 horas. Proponha implementação de refresh token + blacklist via Redis.

2. **Rate limiting:** Nenhum rate limiting nas rotas. Especialmente grave nas rotas de IA que enfileiram jobs caros. Proponha implementação com `@fastify/rate-limit` diferenciada por rota e por usuário.

3. **Validação de entrada:** Todos os bodies de request têm validação Zod adequada? Há endpoints que aceitam dados sem validação?

4. **Path traversal em `/media/:filename`:** O código tem proteção contra `..` e `/`. É suficiente? Que outros vetores de ataque existem?

5. **CORS:** `corsOrigins` vem de env sem validação de formato URL. Que riscos isso traz?

6. **Segredos em logs:** Algum log acidentalmente imprime API keys, payloads com dados sensíveis ou tokens?

7. **SQL Injection:** Com Prisma ORM, qual é o surface de injections? Existe uso de `queryRaw` ou `$executeRaw` sem sanitização?

---

### SEÇÃO F — Performance e Escalabilidade

1. **Media serving da API:** A rota `/media/:filename` em `app.ts` serve binários grandes (vídeos) via `createReadStream` diretamente no processo Fastify. Como isso afeta throughput? Qual é a solução correta para escala?

2. **Storage local:** `uploads/` no filesystem local não funciona com múltiplos containers ou deploy em cloud. Como migrar para S3/R2/GCS com mínimas mudanças? O `storage.ts` já tem uma nota sobre isso — proponha a implementação completa do adapter.

3. **N+1 queries:** Revise todos os `prisma.findMany` com `include`. Existem N+1 queries que podem ser resolvidas com `select` específico ou joins?

4. **PrismaClient por worker:** Cada worker instancia seu próprio PrismaClient. Com 10 workers, isso são 10 × pool_size conexões. Como compartilhar via singleton?

5. **Caching:** Existe caching de estratégias geradas? Um usuário que regenera a mesma estratégia paga 2x pela IA. Quais dados se beneficiariam de cache Redis?

6. **Veo polling síncrono:** O worker fica em polling (a cada 8s, até 90s) esperando Veo. Durante esse tempo, o slot de concorrência do BullMQ está ocupado. Como implementar polling assíncrono com job de checagem separado para liberar o worker?

---

### SEÇÃO G — Observabilidade e Operações

1. **Logging:** Apenas `console.log`. Sem níveis de log, sem structured JSON, sem request ID. Proponha integração com `pino` (já é o logger padrão do Fastify) com formatação estruturada e propagação de request ID para services e workers.

2. **Health check:** `GET /` retorna `{ status: "ok" }` sem verificar BD nem Redis. Proponha um `/health` endpoint para Kubernetes readiness probe que verifica conectividade real.

3. **Métricas:** Sem métricas de aplicação. Quais métricas-chave deveriam ser expostas? (jobs enfileirados, latência de geração por tipo, taxa de falha de IA, custo estimado)

4. **Tratamento de erros inconsistente:** `auth.service.ts` usa `throw { statusCode, message }` (objeto literal sem `instanceof Error`), enquanto outros services usam `Object.assign(new Error(), {...})`. Proponha uma classe `AppError` unificada e mostre como refatorar todos os pontos.

5. **Error tracking:** Sem integração com Sentry ou similar. Como adicionar?

---

### SEÇÃO H — Organização de Código

1. `findUserCompany()` duplicada em `content.service.ts` e `strategy.service.ts`. Onde deve viver?

2. `extractJson()` duplicada em `claude.agent.ts` e `content.agent.ts`. Onde mover?

3. `process.env.GOOGLE_MODEL` direto em `claude.agent.ts` e `content.agent.ts` bypassa `env.ts`. Como corrigir?

4. Convenções de nomenclatura: arquivos de agents seguem naming misto (`.agent.ts` vs `.adapter.ts`). Proponha convenção consistente para o diretório `agents/`.

5. Barrel exports: Falta de `index.ts` nos diretórios facilita imports circulares e dificulta refactoring. Recomenda criar barrels para quais diretórios?

---

### SEÇÃO I — Frontend

1. **Tipagem:** Os types em `frontend/src/types/index.ts` cobrem adequadamente o domínio? Existem `any` ou tipos implícitos?

2. **Error handling no cliente:** Os hooks (`useContent`, `useStrategy`, etc.) tratam adequadamente erros de API? Há feedback visual para o usuário em caso de falha?

3. **Cache de queries:** TanStack Query está configurado com `staleTime` e `gcTime` adequados? Invalidações estão corretas após mutations?

4. **Segurança:** Tokens JWT estão armazenados em `localStorage`? Isso é vulnerável a XSS. Proponha uso de `httpOnly` cookies ou estratégia mais segura.

5. **Loading states:** Operações longas (geração de conteúdo via worker assíncrono) têm feedback de polling/websocket ou o usuário fica sem saber o status?

---

## FASE 3 — PLANO DE AÇÃO PRIORIZADO

Após a auditoria, produza:

### Matriz de Prioridade

Para cada problema encontrado, classifique em:

- **P0 - Crítico:** Quebra funcionalidade, risco de segurança, custo descontrolado
- **P1 - Alto:** Impedimento para escala, má experiência do usuário
- **P2 - Médio:** Dívida técnica significativa, dificulta manutenção
- **P3 - Baixo:** Melhoria desejável, baixo impacto imediato

### Roadmap de Refatoração

**Sprint 1 (Segurança e Estabilidade):** itens P0 com ordem de implementação

**Sprint 2 (Scalability Foundation):** itens P1 com ordem de implementação

**Sprint 3 (Developer Experience):** itens P2+P3 com ordem de implementação

### Estimativa de Impacto

Para as 5 melhorias de maior ROI, estime:

- Esforço de implementação (horas)
- Impacto esperado (redução de custo / aumento de capacidade / redução de risco)

---

## FASE 4 — IMPLEMENTAÇÃO OPCIONAL

Se instruído a implementar (não apenas auditar), priorize nesta ordem:

1. Criar classe `AppError` unificada e refatorar todos os services
2. Extrair `extractJson()` e `findUserCompany()` para utils compartilhados
3. Mover `GOOGLE_MODEL` para `env.ts`
4. Renomear `claude.agent.ts` → `strategy.agent.ts` e atualizar todos os imports
5. Criar interface `AIProvider` com adaptador Gemini concreto
6. Criar `/health` endpoint com checks reais de DB + Redis
7. Adicionar `@fastify/rate-limit` nas rotas de IA
8. Configurar timeout e DLQ no BullMQ por tipo de job
9. Implementar `StorageProvider` interface com adaptador S3/R2

---

## OBSERVAÇÕES IMPORTANTES

- **Não refatore código que não foi pedido** fora dos itens listados
- **Preserve todos os comportamentos existentes** durante refatorações
- **Execute testes** (se existirem) após cada mudança
- **Leia migrations existentes** antes de propor alterações no schema Prisma — não quebre dados existentes
- O arquivo `CLAUDE.md` descreve Python/FastAPI mas o código real é TypeScript/Fastify. **Ignore as instruções de stack do CLAUDE.md e siga o código real.**
- **Documente cada decisão** com comentário inline explicando o "porquê", não o "o quê"
