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
| 1 | Autenticação e Administração | ✅ Concluído |
| 2 | Caixa: base (mesas, config. de preço, abertura/fechamento) | ✅ Concluído |
| 3 | Atendimento self-service (comandas) | ✅ Concluído |
| 4 | Finalização de pagamento (cálculo, desconto, split, fiado) | ✅ Concluído |
| 5 | Produtos, Avulso/Delivery e Estoque | ✅ Concluído |
| 6 | Clientes / Fiado | ✅ Concluído |
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

## Ciclo 1 — o que foi entregue

- Papéis implementados como `django.contrib.auth.models.Group`
  (Administrador, Caixa, Atendente, Estoquista), criados automaticamente
  por uma migration de dados (`contas/migrations/0003_seed_papeis.py`).
- Permissão DRF reutilizável por papel: `contas.permissions.exige_papel(...)`
  — super usuário sempre passa (usado para o primeiro acesso).
- `LogAuditoria` (modelo + `contas.auditoria.registrar_auditoria(...)`),
  usado para registrar criação/edição/desativação de usuário; será
  reutilizado pelos próximos ciclos (caixa, estoque, clientes).
- Endpoints: `POST /api/auth/token/` e `/token/refresh/` (login JWT),
  `GET /api/auth/me/` (usuário logado + papéis), `GET /api/papeis/`,
  `GET/POST/PATCH/DELETE /api/usuarios/` (DELETE desativa em vez de
  excluir, para não quebrar histórico de outros módulos).
- Frontend: `AuthContext` (guarda o estado de login), `RotaProtegida`
  (bloqueia rota por autenticação e, opcionalmente, por papel), páginas
  `Login`, `Home` e `AdminUsuarios` (criar usuário com papéis, listar,
  desativar).
- Testado manualmente via API (login, listar papéis, criar usuário com
  papel, log de auditoria gerado) e verificação de tipos do frontend
  (`tsc -b`) sem erros. **Não testado em navegador real** — pendente de
  confirmação visual pelo usuário.

## Ciclo 2 — o que foi entregue

- Modelos no app `caixa`: `Mesa`, `ConfiguracaoPreco` (sempre lida via
  `ConfiguracaoPreco.atual()`, que pega a mais recente ou cria uma
  zerada), `Caixa` e `MovimentoCaixa` (sangria/suprimento).
- `Caixa.calcular_valor_esperado()` soma abertura + suprimentos - sangrias
  (consulta agregada no banco); vai crescer no Ciclo 4 para incluir
  pagamentos de comanda.
- Endpoints: `/api/mesas/` (CRUD; leitura liberada também para Atendente,
  escrita só Administrador/Caixa), `/api/configuracao-preco/` (GET/PUT),
  `/api/caixas/` com ações `abrir`, `fechar` e `atual`, e
  `/api/movimentos-caixa/` (sempre vinculado ao caixa aberto no momento;
  erro claro se não houver caixa aberto).
- Todas as ações sensíveis (abrir/fechar caixa, sangria/suprimento,
  alterar configuração de preço) geram `LogAuditoria`.
- Frontend: páginas `Caixa` (abrir/fechar, lançar sangria/suprimento, ver
  saldo e histórico de movimentos), `Mesas` (criar mesa, alternar
  livre/ocupada tocando no card) e `Configuração de preço`, todas
  acessíveis pelo menu da Home para papéis Administrador/Caixa.
- Testado manualmente via API (abrir caixa, suprimento, sangria, saldo
  calculado corretamente, fechamento com valor esperado x informado) e
  verificação de tipos do frontend sem erros. Existem dados de teste no
  ambiente local (mesa 1, um caixa já fechado, configuração de preço
  R$25/R$8) — é só dados de desenvolvimento, sem problema em apagar.

## Ciclo 3 — o que foi entregue

- Modelos no app `atendimento`: `Comanda` (N:1 `Mesa`, status
  aberta/fechada, quantidade de pessoas) e `ItemComandaPrato` (N:1
  `Comanda`; cada lançamento do atendente tem quantidade de pratos e de
  extras de proteína; editar/cancelar não apaga o registro — só marca
  `cancelado=True` com quem e quando, para manter o histórico de
  auditoria).
- `Comanda.valor_parcial_estimado()` soma os itens não cancelados usando a
  `ConfiguracaoPreco` atual (mesma regra central: valor do prato +
  qtd. extras × valor da unidade extra) — ainda é só uma estimativa; o
  cálculo oficial de pagamento é do Ciclo 4.
- Abrir uma comanda (`POST /api/comandas/`) ocupa a mesa automaticamente;
  fechar (`/fechar/`) ou transferir (`/transferir/`) libera/ocupa as mesas
  envolvidas. Não é possível abrir uma comanda numa mesa já ocupada, nem
  transferir para uma mesa ocupada.
- Endpoints: `/api/comandas/` (abrir, listar, consultar) com ações
  `transferir` e `fechar`; `/api/itens-comanda-prato/` (lançar, editar via
  PATCH, listar) com ação `cancelar`. Todas as ações sensíveis (abrir,
  transferir, fechar comanda; adicionar, editar, cancelar item) geram
  `LogAuditoria`.
- Frontend: página `Atendimento` (grade de mesas — toca numa mesa livre
  para abrir comanda, numa ocupada para ver a comanda atual) e página de
  detalhe da comanda (lançar pratos/extras, editar ou cancelar cada item,
  ver valor parcial estimado, transferir para outra mesa, fechar comanda).
  Acessível pelo menu da Home para Administrador, Caixa e Atendente.
- Testado manualmente via API (abrir comanda, lançar dois itens, editar
  um, cancelar outro, transferir entre mesas, fechar — valor parcial
  calculado corretamente em cada passo, mesas ocupando/liberando certo) e
  verificação de tipos do frontend (`tsc -b`) sem erros.

**Ajuste de ordem em relação ao plano original (mantido)**: RF20 (bebidas/
sobremesas na comanda) continua adiado para o Ciclo 5, quando `Produto`
existir de verdade.

## Ciclo 4 — o que foi entregue

- Modelos novos no app `caixa`: `Pagamento` (N:1 `Caixa`, 1:1 `Comanda` do
  app `atendimento` — referenciada por string para não criar import
  circular) e `RecebimentoPagamento` (N:1 `Pagamento`; cada linha é uma
  forma de pagamento com seu valor, o que cobre tanto "múltiplas formas de
  pagamento" quanto o split entre pessoas da mesa).
- Cálculo do pagamento: `valor_bruto` vem de
  `Comanda.valor_parcial_estimado()` (travado, pois a comanda precisa estar
  `fechada` e não aceita mais itens); desconto fixo (R$) ou percentual
  (0–100%) gera `valor_desconto_aplicado`; `valor_final = valor_bruto -
  valor_desconto_aplicado`. A soma dos `RecebimentoPagamento` precisa ser
  exatamente igual ao `valor_final` (validado na criação).
- Regras: só é possível pagar uma comanda `fechada` e que ainda não tenha
  pagamento (1:1); precisa existir um caixa aberto no momento (o pagamento
  fica vinculado a ele); não há edição/exclusão de pagamento (registro
  financeiro definitivo, RNF06).
- `Caixa.calcular_valor_esperado()` passou a somar também os recebimentos
  em **dinheiro** vinculados ao caixa (débito/crédito/PIX não entram no
  valor físico esperado na gaveta — só impactam o faturamento, que é
  assunto do Ciclo 7).
- Endpoint: `POST/GET /api/pagamentos/` (sem PATCH/DELETE). Acesso restrito
  a Administrador/Caixa (o Atendente fecha a comanda, mas não finaliza
  pagamento). Toda finalização gera `LogAuditoria` com o valor bruto,
  desconto e valor final.
- `ComandaSerializer` passou a expor `pago` e um resumo de `pagamento`
  (quando existir), para a tela de atendimento saber se uma comanda fechada
  já foi paga ou está aguardando.
- Frontend: nova página `Pagamento` (`/caixa/comandas/:id/pagamento`,
  acessível só a Administrador/Caixa) — mostra o valor bruto, permite
  escolher o tipo de desconto, adicionar/remover linhas de forma de
  pagamento (split) e confere em tempo real se a soma bate com o valor
  final antes de liberar o botão. A página de detalhe da comanda agora
  mostra "Aguardando pagamento" (com link para finalizar, se o usuário tiver
  o papel certo) ou o resumo do pagamento já concluído.
- Testado manualmente via API: desconto fixo com split em duas formas
  (dinheiro + PIX), desconto percentual com uma forma (crédito), bloqueio
  de pagar a mesma comanda duas vezes, bloqueio de pagar comanda ainda
  aberta, e o saldo do caixa somando corretamente só o valor recebido em
  dinheiro. Verificação de tipos do frontend (`tsc -b`) sem erros.

**Ajuste em relação ao plano original**: RF16 (vincular pagamento a cliente
fiado) foi adiado para o Ciclo 6, mesmo padrão usado para o RF20 — não foi
criado nem um FK "preparado" no modelo `Pagamento`, porque o Django valida a
existência do modelo referenciado mesmo numa FK declarada por string, então
não é possível referenciar `clientes.Cliente` antes desse app existir.
Quando o Ciclo 6 chegar, a forma mais simples será adicionar um FK opcional
`cliente` em `Pagamento` (null=True) numa migration nova.

## Ciclo 5 — o que foi entregue

- Novo app `estoque` ganhou modelos reais: `ItemEstoque` (RF26 — insumo
  geral do buffet, ou a base de um `Produto`) e `MovimentoEstoque`
  (RF27-RF29 — ledger de entradas/baixas/ajustes). Igual ao padrão já
  usado para o saldo do caixa (Ciclo 2), não existe um campo de
  "quantidade atual" guardado — `ItemEstoque.quantidade_atual()` soma os
  movimentos, para nunca dessincronizar. `Produto` (RF25) é 1:1 com um
  `ItemEstoque` — vender 1 unidade do produto baixa 1 unidade do estoque.
- `estoque/services.py`: funções únicas para criar movimentos
  (`lancar_entrada`, `lancar_ajuste`, `baixar_estoque`,
  `reverter_baixa_estoque`), usadas também pelos apps `atendimento` e
  `caixa` — mesmo princípio do `contas.auditoria.registrar_auditoria`. O
  endpoint de movimentos (`/api/movimentos-estoque/`) só aceita `entrada`
  e `ajuste` manualmente; `baixa_automatica` só é criada internamente, para
  não poder ser forjada.
- RF20 finalmente possível: `atendimento.ItemComandaProduto` (comanda +
  produto + quantidade, com `preco_unitario` travado no momento do
  lançamento). A baixa de estoque acontece no instante do lançamento (não
  no fechamento da comanda) e é revertida automaticamente se o item for
  cancelado antes do fechamento. `Comanda.valor_parcial_estimado()` agora
  soma pratos **e** produtos lançados.
- RF14/RF15: `caixa.PedidoAvulso` + `ItemPedidoAvulso` (balcão/delivery).
  Começa como um "carrinho" (`aberto`) — itens podem ser adicionados ou
  removidos livremente, sem afetar estoque/caixa ainda. Ao `confirmar`
  (escolhendo a forma de pagamento), baixa o estoque de cada item, vira um
  registro definitivo (sem mais edição, mesmo padrão do `Pagamento`) e, se
  pago em dinheiro, soma ao saldo esperado do caixa aberto no momento.
  `texto_whatsapp` monta a mensagem (itens, valores, endereço se
  delivery) para o caixa copiar e enviar manualmente — sem impressão, como
  decidido desde o plano original.
- `Caixa.calcular_valor_esperado()` ganhou um terceiro componente (além de
  suprimento/sangria e pagamento de comanda em dinheiro): o total de
  pedidos avulsos/delivery confirmados pagos em dinheiro.
- RBAC: o papel **Estoquista** (já existia desde o Ciclo 1, mas sem uso) 
  passou a valer — Administrador/Caixa/Estoquista administram produtos e
  itens de estoque; a leitura de produtos também é liberada ao Atendente
  (precisa escolher bebida/sobremesa na comanda); avulso/delivery continua
  restrito a Administrador/Caixa, como o resto do módulo Caixa.
- Frontend: páginas `Produtos` (cadastro cria o `ItemEstoque` junto, numa
  única tela) e `Itens de estoque` (itens de buffet, lançar entrada/ajuste,
  alerta visual de item abaixo do mínimo — RF30), ambas em
  `/estoque/...`; páginas `Avulso/Delivery` (lista + detalhe com
  carrinho, confirmação por forma de pagamento e texto WhatsApp copiável)
  em `/caixa/avulso...`; a tela de comanda ganhou o lançamento de
  bebidas/sobremesas ao lado do lançamento de pratos.
- Testado manualmente via API: cadastro de produto cria o item de estoque
  correspondente; entrada de estoque; bloqueio de lançar
  `baixa_automatica` manualmente; venda de bebida na comanda baixa o
  estoque e entra no valor parcial da comanda; cancelamento do item
  reverte o estoque; pedido avulso delivery (texto WhatsApp correto,
  confirmação soma ao saldo do caixa, bloqueio de editar depois de
  confirmado); item de buffet sem produto vinculado, com ajuste de
  conferência negativo; alerta de estoque baixo (RF30). Verificação de
  tipos do frontend (`tsc -b`) sem erros.

**Ajustes em relação ao plano original**: diferente do pagamento de
comanda, avulso/delivery não tem desconto nem split — é uma venda de
balcão com uma forma de pagamento só (decisão explícita, para não
complicar um fluxo que no negócio real é simples). Cancelar um pedido
avulso só é possível enquanto ele ainda está "aberto" (carrinho) —
cancelar um pedido já confirmado (que já baixou estoque e já entrou no
caixa) ficou fora do escopo deste ciclo.

## Ciclo 6 — o que foi entregue

- Novo app `clientes` ganhou modelos reais: `Cliente` (RF32 — nome,
  telefone, observações, `ativo`) e `LancamentoContaCliente` (RF33 —
  ledger com tipo `consumo`/`pagamento` e valor; mesmo padrão já usado
  para o saldo do caixa e do estoque — não existe campo de "saldo atual"
  guardado, `Cliente.saldo_devedor()` soma os lançamentos).
- `clientes/services.py`: funções únicas para criar lançamentos
  (`lancar_consumo`, `lancar_pagamento`), mesmo princípio do
  `contas.auditoria.registrar_auditoria` e do `estoque/services.py`.
- RF16 finalmente possível: `caixa.Pagamento` e `caixa.PedidoAvulso`
  ganharam um FK opcional `cliente` (null=True, `on_delete=PROTECT`,
  registros antigos continuam com `cliente=None`); `fiado` foi adicionado
  como forma de pagamento em `RecebimentoPagamento.FORMA_CHOICES`. Pagar
  uma comanda (ou confirmar um avulso/delivery) com "Fiado" exige escolher
  um cliente e gera automaticamente um `LancamentoContaCliente` de
  consumo — sem contar como dinheiro recebido no caixa
  (`Caixa.calcular_valor_esperado()` continua somando só `forma=dinheiro`,
  comportamento confirmado sem alteração).
- Endpoint `/api/clientes/` (GET/POST/PATCH, sem DELETE — cliente com
  histórico não pode ser removido, só inativado via `ativo=False`) com
  ações `extrato` (RF35 — saldo devedor + histórico de lançamentos) e
  `fechar_mes` (RF34 — fechamento total ou parcial; lê saldo e cria o
  lançamento de pagamento dentro da mesma transação com
  `select_for_update`, para dois fechamentos concorrentes do mesmo
  cliente não lerem o mesmo saldo "cheio"; rejeita valor zerado/negativo e
  valor maior que o saldo devedor). Restrito a Administrador/Caixa (dado
  financeiro).
- Primeira suíte de testes automatizados do projeto (`pytest-django`,
  exigido desde o início pelo `CLAUDE.md` mas só agora com um app que
  pedia testes de regra financeira de verdade): 13 testes cobrindo saldo
  devedor, fechamento mensal (total, parcial, rejeições) e os fluxos de
  pagamento/avulso fiado (com e sem cliente, split parcial em fiado,
  regressão de não gravar `cliente` quando a forma não é fiado, e
  `cliente` inválido retornando 400 em vez de erro 500).
- Frontend: páginas `Clientes` (lista com saldo devedor em destaque
  quando positivo, cadastro) e detalhe do cliente (ativar/inativar,
  extrato com consumo/pagamento coloridos, fechar conta total ou
  parcial), em `/clientes...`; a tela de pagamento de comanda e a de
  confirmação de avulso/delivery ganharam "Fiado" como forma de pagamento,
  com seletor de cliente que só aparece quando necessário. Acessível pelo
  menu da Home para Administrador/Caixa.
- Revisão dedicada (agente `qa-reviewer`) nas regras financeiras deste
  ciclo encontrou e corrigiu três problemas antes da liberação: pedido
  avulso pago em dinheiro podia gravar um `cliente` por engano (campo
  perdido no payload); fechamento mensal aceitava valor maior que o saldo
  devedor sem erro (deixaria o cliente "credor" por engano); leitura do
  saldo no fechamento mensal fora da transação atômica (risco de corrida
  em fechamentos concorrentes do mesmo cliente). Os três têm teste de
  regressão.
- Testado manualmente pelo usuário no navegador (cadastro de cliente,
  pagamento de comanda e de avulso em fiado, extrato, fechamento mensal).
  Verificação de tipos do frontend (`tsc -b`) sem erros.

**Problemas pré-existentes encontrados durante a revisão deste ciclo, não
corrigidos (fora do escopo de Ciclo 6, registrados aqui para um ciclo
futuro)**: (1) desde o Ciclo 4, uma comanda com desconto de 100% (valor
final R$0) não pode ser paga pela API atual, porque é exigido pelo menos
um `RecebimentoPagamento` com valor > 0; (2) desde o Ciclo 5,
`estoque.services.baixar_estoque` não valida se há saldo suficiente antes
de baixar — uma venda pode deixar o estoque negativo sem aviso.

## Próximo ciclo (Ciclo 7 — Dashboard e Relatórios)

Escopo: RF36–RF39. Dashboard de vendas (faturamento por período, formas
de pagamento, ticket médio), página de itens em baixa no estoque,
relatório financeiro de caixa (entradas/saídas por período) e relatório
de contas a receber (clientes fiado em aberto). Diferente dos ciclos
anteriores, o app `relatorios` não tem modelos próprios — só agrega dados
já existentes em `caixa`, `estoque` e `clientes` (ledgers que já estão
corretos, confirmado pelos testes automatizados de cada ciclo). Risco
baixo de regra de negócio nova; o cuidado principal é desempenho das
agregações (RNF03) à medida que o histórico crescer.
