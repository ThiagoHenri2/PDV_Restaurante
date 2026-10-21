---
name: novo-app-django
description: Cria um novo app Django seguindo as convenções do projeto PDV Restaurante (estrutura de pastas, nomes em português, registro em settings.py). Use quando precisar adicionar um módulo de backend que ainda não existe.
---

# Criar novo app Django no PDV Restaurante

1. Confirme com `specs/specs.md` se o app já não está previsto dentro de um
   dos apps existentes (`contas`, `caixa`, `atendimento`, `estoque`,
   `clientes`, `relatorios`) antes de criar um novo — a divisão atual é
   intencional e não deve crescer sem necessidade real.
2. Dentro de `backend/`, crie a pasta do app com `__init__.py`, `apps.py`,
   `models.py`, `admin.py` e `migrations/__init__.py`, seguindo exatamente
   o padrão dos apps já existentes (veja `backend/caixa/` como referência).
3. Em `apps.py`, defina `default_auto_field = "django.db.models.BigAutoField"`
   e um `verbose_name` em português.
4. Registre o novo app em `INSTALLED_APPS`, em `backend/config/settings.py`,
   na seção "Apps do projeto".
5. Rode `docker compose exec api python manage.py makemigrations` e
   `docker compose exec api python manage.py migrate` para confirmar que o
   app foi reconhecido.
