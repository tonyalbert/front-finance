# Redesign do Pit Finance — guia de implementação

Os arquivos desta pasta são o protótipo do novo front-end:

- `pf.css`: tokens (tema claro e `[data-theme="dark"]`) e estilos de todos os componentes
- `Main.dc.html`: o app inteiro, com todas as telas, dados de exemplo e interações (o JS fica no fim do arquivo)
- `Auth.dc.html`: Login, Cadastro, Esqueci a senha e Redefinir senha
- `DesignSystem.dc.html`: paleta, tipografia, espaçamento e componentes com seus estados

Use esses arquivos como referência visual e de comportamento. **Não copie o HTML**: os `.dc.html` são protótipos em um formato próprio (`<sc-if>`, `<sc-for>`, `{{...}}`).

## Prompt para o Claude Code

```
Quero aplicar o novo design do Pit Finance que está em /design (pf.css,
Main.dc.html, Auth.dc.html, DesignSystem.dc.html). Leia também
design/IMPLEMENTAR.md.

Regras:
- Manter TODA a funcionalidade atual (rotas, chamadas à API, regras de
  negócio, autenticação). Só troca a camada visual.
- Stack: Next.js (App Router), React 19, Tailwind, shadcn/ui, Recharts,
  react-hook-form + zod, sonner, lucide-react.
- Os tokens de pf.css (claro e [data-theme=dark]) vão para as variáveis
  CSS do shadcn em globals.css: --background, --card, --primary,
  --sidebar, --chart-1..5, mais --income, --expense, --warning,
  --series-in e --series-out. Raio de 10px, fonte Geist e tabular-nums
  em todos os valores monetários.
- Use os componentes do shadcn (Sheet, Dialog, AlertDialog, Command,
  Calendar, Table, Badge, Switch, Skeleton, DropdownMenu) em vez de
  recriar à mão.

Faça por etapas e pare para eu revisar ao fim de cada uma:
1. Tokens + tema claro/escuro/sistema
2. Layout: sidebar recolhível, topbar com período e Ctrl K, bottom nav no mobile
3. Componentes base (KPI card, status pago/pendente/atrasado, badge de parcela, empty state, skeleton)
4. Dashboard
5. Despesas (tabela, filtros com chips, ações em massa, Sheet de nova despesa)
6. Receitas, Despesas Fixas, Credores, Tags
7. Análise com IA, Suporte, Admin, Configurações
8. Login/Cadastro/Esqueci/Redefinir

Antes de começar, leia o projeto e me mostre o plano de quais arquivos
vai mexer em cada etapa.
```

## Regras do design que não podem se perder

- **Semântica de cor:** verde = receita/pago, vermelho = despesa/atrasado, âmbar = pendente/vence em breve. Status sempre com ícone + texto, nunca só cor.
- **Primário:** no claro, `oklch(0.53 0.15 160)` com texto branco. No escuro, `oklch(0.72 0.15 160)` com texto escuro. Os dois passam no contraste AA.
- **Valores:** `tabular-nums`, alinhados à direita nas tabelas, no formato `R$ 1.234,56` (pt-BR).
- **Tabelas:** cabeçalho fixo, ordenação, busca, seleção em massa, ações no menu "⋯", paginação, total no rodapé. No mobile, cada linha vira um card (veja `.table.responsive` em pf.css).
- **Despesas:** toggle rápido de pago no próprio status, badge de parcela (`3/12`), badge "Fixa" para as geradas por despesa fixa, e status "Atrasado" calculado (pendente com vencimento antes de hoje).
- **Formulários:** em Sheet (bottom sheet no mobile), validação inline, máscara de moeda por centavos e data com calendário.
- **Confirmação:** AlertDialog só para excluir.
- **Toasts:** sonner no topo à direita no desktop e acima da bottom nav no mobile.
- **Mobile (≤ 760px):** sidebar some, bottom nav com Início, Despesas, botão + central, Receitas e Mais; alvos de toque de pelo menos 44px; inputs com 16px para o iOS não dar zoom.
- **Gráficos:** barras de receita × despesa usam `--series-in` / `--series-out` (diferem em luminosidade); categorias usam `--chart-1..5`; a grade usa `--chart-grid`.
