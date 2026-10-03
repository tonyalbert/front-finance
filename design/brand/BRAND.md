# Marca Rabbit + Pit Finance (logo A1)

A Rabbit é a marca mãe. Cada serviço usa as mesmas orelhas sobre a sua própria forma; no Pit Finance, a forma é uma carteira.

## Arquivos

| Arquivo | Uso |
|---|---|
| `pit-mark.svg` | Símbolo do Pit Finance em verde (#00854c), fundo claro |
| `pit-mark-light.svg` | Verde claro (#38c789), para fundo escuro |
| `pit-mark-white.svg` | Branco, sobre o verde ou fotos |
| `pit-mark-current.svg` | Usa `currentColor`: ideal para virar componente React |
| `pit-app-icon.svg` | Ícone de app (fundo verde, cantos de 22%) |
| `pit-favicon.svg` | Favicon do Pit Finance |
| `rabbit-mark.svg` / `-white.svg` / `-current.svg` | Símbolo da Rabbit (tinta #131a17) |
| `rabbit-app-icon.svg` | Ícone de app da Rabbit (fundo tinta) |

Os recortes (separação entre orelhas e forma, fecho da carteira, nariz) são máscaras SVG, então os arquivos funcionam em qualquer fundo.

## Regras

- **Nome:** "Pit Finance" em Geist 600, tracking −0,04em, ao lado do símbolo. O símbolo tem a altura da linha mais 20%.
- **Endosso:** "um serviço Rabbit" em texto menor, só onde fizer sentido (rodapé, login, landing).
- **Espaço livre:** mínimo de metade da largura de uma orelha em volta do símbolo.
- **Tamanho mínimo:** 16 px; abaixo de 24 px o nariz da Rabbit some, e isso é esperado.
- **Proibido:** girar, distorcer, trocar a cor por gradiente, ou colocar o símbolo sobre fundo sem contraste.

## Prompt para o Claude Code

```
Quero aplicar a nova marca (logo A1) que está em design/brand/.
Leia design/brand/BRAND.md.

1. Copie os SVGs para public/brand/ e use pit-favicon.svg como favicon
   (app/icon.svg no App Router) e pit-app-icon.svg como apple-icon.
2. Crie components/brand/PitMark.tsx e RabbitMark.tsx a partir dos
   arquivos *-current.svg (props: size e className; cor via currentColor;
   cada instância com id de máscara único usando useId).
3. Crie components/brand/PitLogo.tsx = PitMark + "Pit Finance" em Geist 600.
4. Substitua o ícone de carteira atual (brand-mark) por PitLogo na
   sidebar, na topbar mobile, no login/cadastro e na landing.
5. No rodapé da landing: RabbitMark + "© 2026 Rabbit · Pit Finance é um
   serviço Rabbit".
6. Atualize title e metadados (Open Graph) para "Pit Finance".

```
