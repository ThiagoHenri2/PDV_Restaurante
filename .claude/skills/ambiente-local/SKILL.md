---
name: ambiente-local
description: Sobe, reinicia e verifica o ambiente de desenvolvimento local (Docker Compose) do PDV Restaurante — backend Django, frontend React e Postgres. Use quando o usuário pedir para rodar, testar ou depurar o sistema localmente.
---

# Ambiente local do PDV Restaurante

Pré-requisito: Docker Desktop instalado e rodando. Se os comandos abaixo
falharem com "docker: command not found" ou erro de conexão com o daemon,
peça ao usuário para instalar/abrir o Docker Desktop antes de continuar.

```bash
# primeira vez, ou depois de mudar Dockerfile/requirements/package.json
docker compose up --build

# nas vezes seguintes
docker compose up

# rodando em segundo plano
docker compose up -d

# ver logs de um serviço específico
docker compose logs -f api
docker compose logs -f frontend

# aplicar migrations depois de criar/alterar models
docker compose exec api python manage.py makemigrations
docker compose exec api python manage.py migrate

# criar o primeiro usuário administrador (Django Admin)
docker compose exec api python manage.py createsuperuser

# parar tudo
docker compose down
```

Depois de subir, verificar:
- Frontend: http://localhost:5173 (deve mostrar o status da API).
- API: http://localhost:8000/api/health/ (deve responder `{"status": "ok"}`).
- Django Admin: http://localhost:8000/admin/.

Se o frontend mostrar "não foi possível conectar à API", confirme que o
serviço `api` está de pé (`docker compose ps`) e que `VITE_API_URL` no
`.env` aponta para `http://localhost:8000/api`.
