# PDV Restaurante

Sistema de PDV para um restaurante self-service: mesas, caixa, estoque,
clientes fiado e delivery/avulso. Veja `specs/specs.md` para os requisitos
completos e `.claude/CLAUDE.md` para o contexto de arquitetura usado pelo
Claude Code neste repositório.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  instalado e em execução (inclui Docker Compose).
- Git.

Não é necessário instalar Python ou Node.js na máquina: tudo roda dentro
dos containers Docker.

## Como rodar localmente

```bash
# 1. copie o arquivo de variáveis de ambiente de exemplo
cp .env.example .env

# 2. suba os containers (primeira vez: build das imagens)
docker compose up --build

# 3. em outro terminal, rode as migrations do banco
docker compose exec api python manage.py migrate

# 4. crie um usuário administrador para acessar o Django Admin
docker compose exec api python manage.py createsuperuser
```

Depois disso:

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/health/
- Django Admin: http://localhost:8000/admin/

## Estrutura do projeto

```
backend/        API Django (um app por módulo de negócio)
frontend/       SPA React + Vite + TypeScript + Tailwind
specs/specs.md  Especificação funcional viva (requisitos e status dos ciclos)
.claude/        Contexto, subagentes e skills usados pelo Claude Code
```

## Desenvolvimento

O projeto segue o modelo espiral: cada ciclo entrega um incremento
funcional completo. O status de cada ciclo está em `specs/specs.md`.
