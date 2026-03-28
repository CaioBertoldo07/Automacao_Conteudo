# CLAUDE.md

Guia de desenvolvimento para o assistente de programação responsável por este repositório.

Este documento define **regras obrigatórias de arquitetura, organização e estilo de código** para o projeto.

Sempre siga estas regras antes de gerar qualquer código.

---

# 1. Contexto do Projeto

Este projeto é um **SaaS de automação de conteúdo para Instagram usando múltiplas inteligências artificiais**.

O sistema funciona como um **orquestrador de IA**, onde:

* Claude → planejamento e estratégia
* Gemini → geração de imagens
* Veo → geração de vídeos

O backend coordena toda a execução usando **filas e workers**.

---

# 2. Documentação Fonte do Projeto

Antes de qualquer alteração no código, leia sempre:

* planejamento.md
* arquitetura.md
* banco.md
* desenvolvimento.md

Esses arquivos são a **fonte oficial da arquitetura**.

Nunca ignore essas definições.

---

# 3. Stack Tecnológica Obrigatória

## Backend

* Python
* FastAPI
* PostgreSQL
* Prisma ORM
* Redis
* Workers assíncronos

---

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui

Bibliotecas padrão:

* TanStack Query
* Recharts
* FullCalendar

---

# 4. Estrutura do Repositório

A estrutura do projeto deve seguir este padrão:

```
backend/
    app/
        main.py
        config/
        routes/
        services/
        models/
        schemas/
        utils/
        workers/
        agents/
        scheduler/

    prisma/
        schema.prisma

frontend/
    src/
        components/
        pages/
        services/
        hooks/
        types/
        utils/

docs/
```

Nunca criar arquivos fora dessa organização sem justificativa.

---

# 5. Regras de Desenvolvimento

## Regra 1

Sempre desenvolver **por fases**, seguindo `desenvolvimento.md`.

Nunca implementar funcionalidades de fases futuras sem necessidade.

---

## Regra 2

Explicar sempre:

* o que será criado
* por que está sendo criado
* onde será criado

Antes de gerar código.

---

## Regra 3

Gerar código **modular e escalável**.

Evitar:

* arquivos gigantes
* lógica de negócio dentro de rotas
* repetição de código

---

## Regra 4

Separação de responsabilidades obrigatória.

### Rotas

Apenas recebem requisições e retornam respostas.

### Services

Contêm lógica de negócio.

### Models

Representação de dados.

### Schemas

Validação de dados (Pydantic).

---

# 6. Padrões Backend

## Rotas

```
routes/
    auth_routes.py
    company_routes.py
    post_routes.py
```

---

## Services

```
services/
    auth_service.py
    company_service.py
    content_service.py
```

---

## Schemas

```
schemas/
    user_schema.py
    company_schema.py
    post_schema.py
```

---

# 7. Padrões Frontend

Componentes devem ser **pequenos e reutilizáveis**.

```
components/
    ui/
    dashboard/
    calendar/
    posts/
```

---

## Páginas

```
pages/
    login
    dashboard
    calendar
    content
    settings
```

---

# 8. Integração com IA

Nunca misturar lógica de IA diretamente nas rotas.

Sempre usar **agents ou services dedicados**.

Exemplo:

```
agents/
    claude_agent.py
```

---

# 9. Workers

Jobs pesados devem ser executados em **workers separados**.

Nunca executar geração de conteúdo diretamente na API.

---

# 10. Banco de Dados

Banco principal:

PostgreSQL

ORM:

Prisma

Schema deve sempre estar em:

```
backend/prisma/schema.prisma
```

---

# 11. Padrões de Código

## Python

* usar tipagem sempre que possível
* funções pequenas
* nomes claros
* evitar lógica complexa dentro de rotas

---

## TypeScript

* tipagem obrigatória
* evitar any
* usar interfaces

---

# 12. Boas Práticas

Sempre:

* validar dados
* tratar erros
* documentar endpoints
* organizar imports

---

# 13. Escalabilidade

Este sistema deve ser preparado para:

* múltiplos workers
* múltiplos usuários
* alto volume de jobs

---

# 14. Proibição Importante

Nunca:

* implementar lógica de IA diretamente nas rotas
* misturar frontend e backend
* ignorar o roadmap do projeto
* criar código sem explicar antes

---

# 15. Fluxo de Desenvolvimento

Sempre seguir este processo:

1. Ler documentação
2. Planejar implementação
3. Explicar estrutura
4. Gerar código
5. Testar funcionamento

---

# 16. Objetivo do Código

O código deve ser:

* limpo
* modular
* escalável
* fácil de manter
* preparado para crescimento

---

# 17. Filosofia do Projeto

Este projeto deve evoluir para se tornar:

**um agente autônomo de marketing para pequenas empresas.**

Todas as decisões de arquitetura devem considerar esse objetivo.
