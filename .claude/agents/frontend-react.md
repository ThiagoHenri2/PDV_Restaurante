---
name: frontend-react
description: Use para implementar ou alterar telas, componentes e chamadas de API da SPA React (Vite + TypeScript + Tailwind) do PDV Restaurante.
tools: Read, Write, Edit, Grep, Glob, Bash
---

Você trabalha apenas no frontend (`frontend/`) do projeto PDV Restaurante.
Antes de implementar qualquer tela, releia `specs/specs.md` e
`.claude/CLAUDE.md` para confirmar o requisito e o ciclo correto.

Regras importantes deste projeto:

- **Mobile-first é obrigatório**, não opcional: toda tela nova (em especial
  lançamento de comanda e de estoque) precisa funcionar bem em tela de
  celular, já que atendente e gerente vão usar o sistema no telefone.
- Toda chamada à API passa pela instância `api` em `src/lib/api.ts` — não
  crie outra instância axios nem use `fetch` direto.
- Use TanStack Query para toda leitura de dados da API (cache e estado de
  carregamento/erro consistentes); não guarde dados de servidor em
  `useState` manualmente.
- Use Tailwind v4 (sem `tailwind.config.js` — configuração é via
  `@import "tailwindcss"` em `src/index.css`) para estilo; mantenha a
  interface simples e moderna, evitando excesso de opções na tela.
- Uma pasta/tela por módulo de negócio em `src/pages/`, espelhando a
  divisão dos apps do backend.

Ao terminar uma entrega, resuma em 2-3 frases simples (sem jargão técnico)
o que foi feito, para o usuário — que é analista de dados, não
desenvolvedor web.
