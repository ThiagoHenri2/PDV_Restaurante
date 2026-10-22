# PDV Restaurante — Contexto do Projeto

## Visão do negócio

Sistema PDV para um restaurante **self-service** (uso próprio, não é um
produto para outros clientes):

- O cliente se serve sozinho; o atendente depois vai à mesa e registra a
  quantidade de pratos e de **unidades extras de proteína** (acima da cota
  do prato simples). Não existe cardápio para o self-service — o valor é
  calculado por uma configuração de preço (valor do prato + valor da
  unidade extra), definida no módulo Caixa.
- Bebidas e sobremesas **são** produtos cadastrados (vínculo 1:1 com
  estoque, com baixa automática ao vender).
- O caixa também lança **pedidos avulsos** (balcão/marmitex) e **delivery**
  (com endereço opcional e geração de texto para WhatsApp — sem impressão).
- Existem **clientes fiado**: consomem ao longo do mês e pagam no
  fechamento mensal (conta corrente simples, sem limite de crédito no MVP).
- O estoque do buffet self-service (insumos) **não** tem baixa automática
  por receita — só lançamento de entrada e conferência manual ao fim do
  dia, com alerta de itens em baixa. Isso é diferente dos produtos
  (bebida/sobremesa/marmitex), que têm baixa automática.
- Pagamento de comanda aceita **desconto** (fixo ou percentual) e split
  entre pessoas.
- Backup automatizado e taxa de serviço estão fora do MVP (decisão
  explícita do usuário).

O plano completo (requisitos funcionais/não funcionais e os ciclos do
modelo espiral) está em `specs/specs.md`. Não reimplemente decisões de
escopo sem checar esse documento primeiro.

## Stack

- **Backend**: Python + Django + Django REST Framework, autenticação via
  JWT (`djangorestframework-simplejwt`). Banco: PostgreSQL.
- **Frontend**: React + Vite + TypeScript, Tailwind CSS v4, TanStack Query
  para dados vindos da API, React Router para rotas. Mobile-first é
  requisito — toda tela nova deve ser testada em viewport de celular.
- **Infra**: Docker Compose (serviços `db`, `api`, `frontend`). Em
  desenvolvimento local não há Nginx — o frontend fala direto com a API via
  `VITE_API_URL`. Nginx só entra no Ciclo 8 (deploy na VPS Hostinger).
- O usuário é analista de dados (Python/SQL fortes), **sem experiência
  prévia em desenvolvimento web** — ao final de cada ciclo, explique em
  termos simples o que foi construído e por quê.

## Estrutura de pastas

```
backend/
  config/            # settings, urls, wsgi/asgi
  contas/            # usuários, papéis, permissões (Ciclo 1)
  caixa/             # mesas, config. de preço, caixa, pagamentos, avulso/delivery (Ciclos 2 e 4)
  atendimento/       # comandas self-service (Ciclo 3)
  estoque/           # produtos de venda direta + itens de buffet (Ciclo 5)
  clientes/          # clientes fiado e conta corrente (Ciclo 6)
  relatorios/        # dashboards e relatórios, sem modelos próprios (Ciclo 7)
frontend/
  src/pages/         # uma pasta/tela por módulo de negócio
  src/lib/api.ts      # instância axios usada por toda a SPA
specs/specs.md        # especificação viva (RF/RNF + ciclos do espiral)
.claude/agents/        # subagentes especializados deste projeto
.claude/skills/         # skills específicas deste projeto
```

## Convenções

- Um app Django por módulo de negócio (já criados; não quebrar essa
  divisão).
- Toda regra de cálculo financeiro (valor de comanda, baixa de estoque,
  lançamento em conta de cliente) deve ser coberta por teste automatizado
  (`pytest-django`) e executada dentro de uma transação atômica.
- Nomes de modelos, campos e rotas de API em português, seguindo os nomes
  já usados no plano e em `specs/specs.md` (ex: `Comanda`, `MovimentoCaixa`,
  `PedidoAvulso`).
- Commits pequenos, um por entrega relevante dentro do ciclo.

## Comandos úteis

```bash
# subir tudo (primeira vez ou depois de mudar Dockerfile/dependências)
docker compose up --build

# rodar migrations
docker compose exec api python manage.py migrate

# criar um superusuário para acessar o Django Admin
docker compose exec api python manage.py createsuperuser

# rodar os testes do backend
docker compose exec api pytest

# rodar os testes do frontend
docker compose exec frontend npm test
```

- Frontend em desenvolvimento: http://localhost:5173
- API em desenvolvimento: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

## Depois de qualquer alteração de código, antes de pedir para o usuário testar

O HMR do Vite e o autoreload do Django nem sempre pegam tudo (observado no
Ciclo 1: o navegador do usuário continuou mostrando a tela antiga mesmo
depois de hard refresh, fechar o navegador inteiro e trocar de navegador —
só resolveu depois de recriar os containers do zero). Por isso, **sempre**
que terminar uma implementação (não só no fim do ciclo, depois de qualquer
leva de mudanças de código do backend ou do frontend), antes de dizer ao
usuário que pode testar, rodar:

```bash
docker compose down
docker compose up --build -d
```

Não basta `docker compose restart`. Só depois disso pedir para o usuário
testar no navegador (e, se possível, validar antes com curl/Invoke-
WebRequest que o conteúdo novo está sendo servido, como já é feito nas
verificações manuais de cada ciclo).

## Fluxo entre ciclos

Assim que o usuário confirmar que um ciclo está funcionando (testado por
ele, não só por mim), antes de começar a implementação do próximo ciclo:
atualizar o status em `specs/specs.md` e o "Estado atual" abaixo, comitar/
enviar ao GitHub, e então **pedir explicitamente ao usuário para rodar
`/compact` (ou `/clear`)** antes de eu seguir para o próximo ciclo — o
estado do projeto vive nestes arquivos (`specs/specs.md` e este
`CLAUDE.md`), não na conversa, então compactar entre ciclos não perde
contexto relevante.

## Estado atual

Ciclos 0 a 4 concluídos: esqueleto do backend/frontend, autenticação JWT e
papéis, módulo Caixa (mesas, configuração de preço, abertura/fechamento de
caixa, sangria/suprimento), módulo Atendimento (abrir comanda, lançar/
editar/cancelar pratos + extras de proteína, transferir comanda, fechar
comanda) e agora a finalização de pagamento (`caixa.Pagamento` +
`RecebimentoPagamento`: cálculo a partir do valor parcial da comanda,
desconto fixo/percentual, múltiplas formas de pagamento/split, saldo do
caixa somando só o dinheiro recebido) funcionando de ponta a ponta.
Próximo: Ciclo 5 (Produtos, Avulso/Delivery e Estoque). Notas de escopo
adiado (ver `specs/specs.md`): RF20 (bebidas/sobremesas na comanda) vai
para o Ciclo 5, quando `Produto` existir; RF16 (vincular pagamento a
cliente fiado) vai para o Ciclo 6, quando `Cliente` existir.
