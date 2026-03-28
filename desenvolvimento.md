# Roadmap de Desenvolvimento

## Fase 1 — Fundação do Projeto

Objetivo: criar base do sistema.

### Backend

* criar projeto FastAPI
* configurar PostgreSQL
* configurar Prisma
* criar autenticação JWT
* criar CRUD de usuários

### Frontend

* iniciar projeto React com Vite
* configurar TypeScript
* configurar Tailwind
* criar layout base

---

# Fase 2 — Sistema de Empresas

Objetivo: permitir cadastro de empresas.

### Backend

* CRUD de empresas
* endpoint de perfil da empresa

### Frontend

* tela de cadastro de empresa
* edição de empresa
* dashboard inicial

---

# Fase 3 — Estratégia de Conteúdo com IA

Objetivo: gerar estratégia automática.

### Backend

* integração com Claude
* geração de estratégia de conteúdo
* salvar estratégia no banco

### Frontend

* visualização da estratégia
* aprovação da estratégia

---

# Fase 4 — Calendário de Conteúdo

Objetivo: gerar agenda automática.

### Backend

* geração de calendário semanal
* criação de jobs de geração

### Frontend

* tela de calendário
* visualização dos posts

---

# Fase 5 — Geração de Conteúdo

Objetivo: gerar posts reais.

### Backend

Workers devem gerar:

Imagem → Gemini
Vídeo → Veo
Texto → Claude

Salvar conteúdo no banco.

---

# Fase 6 — Sistema de Filas

Objetivo: processamento escalável.

Implementar:

* Redis
* workers
* controle de jobs

---

# Fase 7 — Dashboard

Mostrar:

* posts gerados
* calendário
* downloads
* status das gerações

---

# Fase 8 — Automação Completa

Sistema deve:

* gerar conteúdo semanal automaticamente
* atualizar calendário
* enviar notificações

---

# Fase 9 — MVP

Primeira versão comercial:

Funcionalidades:

* cadastro de empresa
* geração automática de posts
* download de conteúdo
* calendário

---

# Fase 10 — Escala

Melhorias:

* múltiplos workers
* analytics
* integrações com redes sociais
* agendamento automático
