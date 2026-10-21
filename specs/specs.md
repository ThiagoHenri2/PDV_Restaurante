# Especificação Funcional — PDV Restaurante (Self-Service)

> Documento vivo. Atualizado conforme cada ciclo do modelo espiral avança.
> O plano arquitetural completo (com diagrama e justificativas de stack)
> está em `.claude/CLAUDE.md` (resumo) e no histórico de planejamento do
> projeto. Este arquivo é a fonte única de verdade sobre **o que** cada
> módulo deve fazer.

## Status geral

| Ciclo | Descrição | Status |
|---|---|---|
| 0 | Fundação técnica + estrutura agêntica + GitHub | ✅ Concluído |
| 1 | Autenticação e Administração | ⬜ Não iniciado |
| 2 | Caixa: base (mesas, config. de preço, abertura/fechamento) | ⬜ Não iniciado |
| 3 | Atendimento self-service (comandas) | ⬜ Não iniciado |
| 4 | Finalização de pagamento (cálculo, desconto, split, fiado) | ⬜ Não iniciado |
| 5 | Produtos, Avulso/Delivery e Estoque | ⬜ Não iniciado |
| 6 | Clientes / Fiado | ⬜ Não iniciado |
| 7 | Dashboard e Relatórios | ⬜ Não iniciado |
| 8 | Hardening e deploy na VPS Hostinger | ⬜ Não iniciado |

## Regras de negócio centrais (não mudam entre ciclos)

- O restaurante é **self-service**: o cliente se serve; não há cardápio
  cadastrado para o prato em si.
- O valor do prato é: `valor_prato_simples + (qtd_extras_proteina ×
  valor_unidade_extra)`. Essa configuração de preço é editável (módulo
  Caixa) e usada no cálculo final no pagamento, não no momento do
  lançamento na mesa.
- Bebidas, sobremesas e itens de avulso/delivery **são produtos
  cadastrados**, vinculados 1:1 a um item de estoque, com **baixa
  automática** de estoque ao vender.
- Itens de buffet (insumos do self-service) **não têm baixa automática** —
  apenas lançamento de entrada e conferência manual ao fim do dia.
- Clientes fiado consomem ao longo do mês e pagam no fechamento mensal;
  não há limite de crédito/bloqueio no MVP.
- Pedidos avulsos (balcão) e delivery usam a mesma base de produtos
  pré-cadastrados; delivery adiciona endereço opcional e gera texto para
  WhatsApp (sem impressão).
- Pagamento de comanda aceita desconto (fixo ou percentual) e split entre
  pessoas.
- Fora do MVP (decisão explícita do usuário): emissão fiscal (NFC-e),
  backup automatizado, taxa de serviço, operação 100% offline.

## Requisitos Funcionais (RF)

### Administração
- RF01: Login/logout com autenticação segura (JWT).
- RF02: CRUD de usuários do sistema.
- RF03: Papéis (Administrador, Caixa, Atendente, Estoquista/Gerente) com
  permissões granulares por funcionalidade.
- RF04: Atribuição de papéis a usuários.
- RF05: Log de auditoria de ações sensíveis (abertura/fechamento de caixa,
  alteração de estoque, desconto concedido, baixa de fiado).

### Caixa
- RF06: Cadastro e gestão de mesas (número, status: livre/ocupada).
- RF07: Configuração de preços (valor do prato simples e valor da unidade
  extra de proteína).
- RF08: Abertura de caixa (valor inicial em dinheiro).
- RF09: Fechamento de caixa com conferência (esperado x contado).
- RF10: Sangria (retirada) e suprimento (entrada) de caixa.
- RF11: Finalização de pagamento de comanda de mesa, com cálculo
  automático (ver regra central acima).
- RF12: Campo de desconto na finalização do pagamento (fixo ou
  percentual), registrando quem concedeu.
- RF13: Múltiplas formas de pagamento (dinheiro, débito, crédito, PIX) e
  split de conta.
- RF14: Lançamento de pedido avulso (balcão/marmitex) com itens
  pré-cadastrados e baixa automática de estoque.
- RF15: Lançamento de pedido delivery (itens pré-cadastrados, endereço
  opcional, geração de texto para WhatsApp).
- RF16: Vincular pagamento (mesa, avulso ou delivery) a cliente fiado.
- RF17: Relatório de movimento de caixa por turno/dia.

### Atendimento (self-service)
- RF18: Alocar cliente(s) a uma mesa, abrindo comanda.
- RF19: Registrar quantidade de pratos e de unidades extras de proteína.
- RF20: Registrar bebidas/sobremesas (produtos pré-cadastrados), com baixa
  automática de estoque.
- RF21: Editar/cancelar itens da comanda (com log de auditoria).
- RF22: Transferir comanda entre mesas.
- RF23: Consultar status da comanda (itens, valor parcial, tempo na mesa).
- RF24: Fechar comanda e encaminhar para pagamento.

### Estoque / Produtos
- RF25: Cadastro de produtos de venda direta (bebida, sobremesa, marmitex,
  itens de delivery), vinculados 1:1 a um item de estoque.
- RF26: Cadastro de itens de estoque gerais do buffet self-service.
- RF27: Lançamento de entradas de estoque.
- RF28: Baixa automática de estoque para produtos de venda direta.
- RF29: Ajuste/conferência manual de estoque (itens de buffet).
- RF30: Alerta de itens com estoque baixo (abaixo do mínimo configurado).
- RF31: Interface responsiva (mobile-first) para lançamento e consulta.

### Clientes (fiado)
- RF32: Cadastro de clientes.
- RF33: Conta corrente do cliente (lançamento de débito por consumo).
- RF34: Fechamento mensal da conta do cliente.
- RF35: Histórico de consumo/extrato por cliente.

### Dashboard / Relatórios
- RF36: Dashboard de vendas (faturamento por período, formas de pagamento,
  ticket médio).
- RF37: Página dedicada de itens em baixa no estoque.
- RF38: Relatório financeiro de caixa (entradas/saídas por período).
- RF39: Relatório de contas a receber (clientes fiado em aberto).

## Requisitos Não Funcionais (RNF)

- RNF01 — Segurança: hash de senha, JWT, HTTPS em produção, RBAC em toda
  rota sensível.
- RNF02 — Mobile-first: telas de atendente/gerente devem funcionar bem em
  celular (requisito de negócio, não opcional).
- RNF03 — Desempenho: operações do fluxo de atendimento/caixa respondem em
  menos de 1s sob carga normal.
- RNF04 — Portabilidade: todo o sistema roda via `docker compose up`,
  tanto na VPS Hostinger quanto em servidor local.
- RNF05 — Integridade transacional: pagamento, baixa de estoque e
  lançamento em conta de cliente fiado são atômicos.
- RNF06 — Auditabilidade: toda alteração em caixa/estoque/desconto/fiado é
  rastreável (quem, quando, o quê).
- RNF07 — Usabilidade: interface simples para atendente com treinamento
  mínimo.
- RNF08 — Manutenibilidade: apps Django coesos por domínio, testes
  automatizados nas regras críticas.

## Modelo de dados — entidades principais

`Usuario` (N:N `Papel`) · `Mesa` · `Comanda` (N:1 `Mesa`, opcional N:1
`Cliente`) → `ItemComandaPrato` (qtd. pratos, qtd. extras) e
`ItemComandaProduto` (N:1 `Produto`) · `ConfiguracaoPreco` · `Produto`
(1:1 `ItemEstoque`) · `ItemEstoque` · `MovimentoEstoque` · `PedidoAvulso`
(tipo balcão/delivery; endereço opcional; itens; opcional N:1 `Cliente`) ·
`Caixa` (1:N `MovimentoCaixa`, 1:N `Pagamento` com campo `desconto`) ·
`Cliente` (1:N `LancamentoContaCliente`) · `LogAuditoria`.

## Ciclo 0 — o que foi entregue

- Backend Django + DRF com apps `contas`, `caixa`, `atendimento`,
  `estoque`, `clientes`, `relatorios` criados (vazios, prontos para
  receber os modelos do ciclo correspondente).
- Modelo de usuário customizado (`contas.Usuario`) já configurado como
  `AUTH_USER_MODEL` (evita migração dolorosa depois).
- Autenticação JWT (`/api/auth/token/`, `/api/auth/token/refresh/`) e
  endpoint de health check (`/api/health/`).
- Frontend React + Vite + TypeScript + Tailwind v4, com TanStack Query e
  React Router configurados, e uma tela simples que confirma a conexão com
  a API.
- Docker Compose com serviços `db` (Postgres), `api` (Django) e `frontend`
  (Vite dev server).
- Estrutura `.claude/` (CLAUDE.md, agents, skills) e este `specs.md`.

## Próximo ciclo (Ciclo 1 — Autenticação e Administração)

Escopo: RF01–RF05. Entregar tela de login na SPA, modelo de papéis e
permissões em `contas`, e um fluxo (via Django Admin customizado ou tela
própria) para o administrador criar usuários e atribuir papéis.
