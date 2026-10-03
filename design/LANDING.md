# Landing page do Pit Finance — guia de implementação

Arquivos de referência nesta pasta:

- `Landing.dc.html`: a página inteira (protótipo; use como referência, não copie o HTML)
- `landing.css`: estilos específicos da landing
- `pf.css`: os mesmos tokens e componentes do app (cores, botões, cards, badges)

## Prompt para o Claude Code

```
Quero implementar a landing page do Pit Finance que está em
design/Landing.dc.html (estilos em design/landing.css e design/pf.css).
Leia também design/LANDING.md.

Regras:
- Página pública, sem login. Veja como as rotas estão hoje e me proponha
  onde ela fica (ex.: "/" para a landing e o app logado em "/dashboard").
  Não quebre o redirecionamento de quem já está logado.
- Use os mesmos tokens do app (globals.css) e os componentes do shadcn
  (Button, Card, Badge, Accordion para as perguntas). Fonte Geist,
  números com tabular-nums.
- Conteúdo e textos exatamente como no protótipo, em pt-BR.
- Botões "Criar conta grátis" / "Começar 7 dias grátis" levam ao
  cadastro; "Entrar" leva ao login.
- A prévia do painel no topo é feita com HTML/componentes (não imagem),
  sempre no tema escuro.
- Responsiva: no celular o menu de links some, os botões ocupam a
  largura toda e as seções viram uma coluna.
- Faça SEO básico: title, meta description e Open Graph.

Antes de começar, me mostre o plano (rota, arquivos e componentes).
```

## Seções (na ordem)

1. Barra fixa: logo, links (Recursos, Como funciona, Preço, Perguntas), Entrar, Criar conta grátis
2. Hero: selo "7 dias grátis · sem cartão de crédito", título, subtítulo, 2 botões, nota "Depois do teste, R$ 19,99 por mês." e prévia do painel
3. Recursos: 3 cards (contas fixas, parcelas, vencimentos) e 4 cards menores (credores, tags, celular e computador, tema claro/escuro)
4. Como funciona: 3 passos
5. Preço: R$ 19,99/mês, linha do tempo (hoje → dia 7 → depois) e lista do que está incluído
6. Perguntas frequentes (4)
7. Chamada final com faixa no tema oposto ao da página
8. Rodapé: © 2026, Privacidade, Termos de uso, Suporte (links ainda sem página)
