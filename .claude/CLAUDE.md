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
  `VITE_API_URL` (ou resolução automática por `window.location.hostname`,
  ver Ciclo 9). Nginx só entra no deploy na VPS Hostinger (adiado, sem
  ciclo fixo).
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

Ciclos 0 a 8 concluídos: esqueleto do backend/frontend, autenticação JWT e
papéis, módulo Caixa (mesas, configuração de preço, abertura/fechamento de
caixa, sangria/suprimento, pagamento de comanda com desconto/split),
módulo Atendimento (abrir comanda, lançar/editar/cancelar pratos + extras
de proteína, lançar/cancelar bebidas e sobremesas, transferir e fechar
comanda), módulo Estoque (`ItemEstoque`/`MovimentoEstoque`/`Produto`, com
baixa automática ao vender e entrada/ajuste manual para os itens de
buffet), Avulso/Delivery (`caixa.PedidoAvulso`, carrinho → confirmação por
forma de pagamento → texto WhatsApp), módulo Clientes
(`Cliente`/`LancamentoContaCliente`, conta corrente, fechamento mensal,
extrato) com RF16 implementado — pagamento de comanda e avulso/delivery
aceitam "Fiado" como forma de pagamento, vinculando a um cliente (FK
opcional em `caixa.Pagamento` e `caixa.PedidoAvulso`) —, módulo
Relatórios (app `relatorios`, sem modelos próprios): dashboard de vendas
(faturamento, formas de pagamento, ticket médio, por dia), relatório de
caixa (entradas/saídas por sessão), itens em baixa no estoque e contas a
receber (clientes fiado em aberto), todos com filtro de período onde
aplicável e RBAC por papel — e agora o Ciclo 8 (reforma visual completa):
navegação persistente (bottom tab bar + hubs — Caixa e Estoque reúnem
tudo numa só página, inclusive Avulso/Delivery e Configuração de preço em
modal), paleta de cores "comida caseira de Minas" (terracota), layout em
grid no desktop, e uma rodada de correção de bugs reais de fluxo achados
durante o teste manual: mesa desincronizada bloqueando abertura de
comanda, pagamento de comanda com valor final R$0 não finalizava
(problema pré-existente desde o Ciclo 4, agora corrigido), "← Voltar"
sempre indo para Atendimento, saldo do caixa não atualizando após avulso
confirmado. RF18 ganhou `nome_responsavel` opcional na comanda. Suíte
`pytest-django` do projeto continua com 29 testes (13 do Ciclo 6 + 16 do
Ciclo 7; o Ciclo 8 não introduziu RF novo que exigisse teste automatizado
adicional, mas foi coberto por teste manual extenso do usuário). Próximo:
Ciclo 9 (Acesso via rede local/celular).

Problemas pré-existentes conhecidos, registrados mas não corrigidos (ver
detalhe em `specs/specs.md`, seção Ciclo 6): `baixar_estoque` não valida
saldo suficiente antes de baixar (Ciclo 5) — o outro problema registrado
ali (comanda com desconto de 100% não podia ser paga) foi corrigido no
Ciclo 8.

## Planejado (ainda não implementado) — Ciclo 9

Planejado em sessão de Plan Mode; aguardando o usuário pedir para
implementar. O antigo "Ciclo 8 (deploy na VPS Hostinger)" continua
adiado a pedido do usuário, sem número de ciclo fixo, a retomar quando
ele decidir (ver `specs/specs.md`).

### Ciclo 9 — Acesso pelo celular na rede local

Decisão já confirmada: `DJANGO_ALLOWED_HOSTS=*` (simples, aceitável por
ser uso local, nunca exposto à internet — revisar antes de qualquer
deploy real).

- **Backend**: `.env`/`.env.example` → `DJANGO_ALLOWED_HOSTS=*`. Em
  `backend/config/settings.py`, manter `CORS_ALLOWED_ORIGINS` como está e
  **adicionar** `CORS_ALLOWED_ORIGIN_REGEXES` para as 3 faixas de rede
  privada na porta 5173:
  ```python
  CORS_ALLOWED_ORIGIN_REGEXES = [
      r"^http://192\.168\.\d{1,3}\.\d{1,3}:5173$",
      r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$",
      r"^http://172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}:5173$",
  ]
  ```
  Mais seguro que abrir CORS totalmente. Fixo no código (não em `.env`)
  por descrever uma invariante estrutural, não uma config de ambiente.
  `CSRF_TRUSTED_ORIGINS` não é necessário (API só usa `JWTAuthentication`,
  sem cookie de sessão nas chamadas da SPA).
- **Frontend**: `frontend/src/lib/api.ts` resolve a URL base em runtime do
  navegador, com `VITE_API_URL` como override opcional:
  ```ts
  function resolverBaseUrl() {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return `http://${window.location.hostname}:8000/api`;
  }
  export const api = axios.create({ baseURL: resolverBaseUrl() });
  ```
  No PC resolve para `localhost`; no celular resolve para o IP que ele
  usou pra abrir a página — sobrevive a troca de IP por DHCP (só precisa
  recarregar a página). `.env`/`.env.example`: `VITE_API_URL=` (vazio,
  com comentário explicando o fallback automático).
- **Documentação**: adicionar, depois de "Comandos úteis" neste mesmo
  arquivo, o passo a passo de acesso (descobrir IP do PC via `ipconfig`,
  celular na mesma Wi-Fi, acessar `http://<IP-do-PC>:5173`) e a nota de
  segurança permanente sobre `ALLOWED_HOSTS=*`.
- **Rebuild**: `docker compose down && docker compose up --build -d`
  (mudança de `.env` não é pega por `restart` simples).
- **Riscos aceitos**: `ALLOWED_HOSTS=*` é superfície mais aberta que
  produção (aceitável só por uso local); qualquer dispositivo na mesma
  Wi-Fi pode tentar CORS, mas sem JWT válido não acessa dado nenhum.

### `specs/specs.md` (atualizar quando a implementação for concluída e
confirmada pelo usuário, não antes — regra de "Fluxo entre ciclos" já
documentada acima)

Tabela de status: "8 | Hardening e deploy na VPS Hostinger" deixa de ser
o Ciclo 8. Os números 8 e 9 passam a ser "Reforma visual e navegação
persistente" e "Acesso via rede local (celular)". O deploy na Hostinger
sai da tabela numerada e vira um parágrafo "Adiado — retomar quando o
usuário decidir" (sem número de ciclo fixo). Nenhum dos dois ciclos
introduz RF novo (mesma categoria do Ciclo 0 — transversal, não
funcionalidade de negócio).
