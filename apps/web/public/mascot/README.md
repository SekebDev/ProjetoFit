# Mascote — spec de arte

Personagem original (NAO usar personagem de anime existente: direito autoral).
Nome atual: **Rackie** (trocar em `src/components/Mascot.tsx` -> MASCOT_NAME).

## Personalidade

Parceira de treino, nao cobradora. Ao contrario do Duolingo, ela **nao usa culpa**.
Comemora PR **e comemora descanso** — o plano do app e explicito em nao incentivar
treinar todos os dias. Ela protege a recuperacao.

## Arquivos esperados

Coloque nesta pasta, exatamente com estes nomes:

| Arquivo | Estado | Onde aparece | Fase |
|---|---|---|---|
| `idle.png` | neutra, em pe, sorriso leve | dashboard (hero) | 1 |
| `sleep.png` | dormindo / entediada | telas vazias, sem resultado | 1 |
| `cheer.png` | comemorando, bracos pra cima | PR batido, sessao concluida, XP | 3 / 7 |
| `rest.png` | sentada, bebendo agua, relaxada | timer de descanso, dia de folga | 3 |
| `sad.png` | cabisbaixa, sentindo falta (NAO choro/culpa) | streak em risco | 7 |

## Especificacao tecnica

- **512x512 px**, PNG com **fundo transparente** (alpha real, nao xadrez branco)
- Corpo inteiro, centralizado, com folga de ~5% nas bordas
- Proporcao chibi: ~2.5 cabecas de altura
- Vista frontal 3/4, consistente entre todas as poses
- Lineart limpa e grossa, cel shading (sombra chapada), paleta reduzida
- Luz vindo de cima-esquerda em todas as poses
- **Alto contraste**: ela aparece sobre fundo grafite `#0E1014` — evite roupa/cabelo escuros

## Consistencia (importante)

Gere primeiro um **character sheet** e reutilize a mesma seed / character reference
nas 5 poses. Personagem inconsistente entre poses destroi o efeito.

## Prompt base (adapte ao seu gerador)

```
chibi anime girl, original character, full body, 2.5 heads tall proportions,
gym training outfit: coral sports bra, dark shorts, white sneakers, wrist tape,
messy ponytail, cheerful expression, thick clean lineart, flat cel shading,
limited warm palette (coral, cream, warm skin), light from top-left,
centered, front 3/4 view, transparent background, 512x512, character sheet
```

Trocar so a acao por pose:

- `idle.png` — "standing relaxed, slight smile, hands at sides"
- `sleep.png` — "sleeping, sitting, head nodding, small zzz"
- `cheer.png` — "cheering, both arms raised, big happy smile, eyes closed"
- `rest.png` — "sitting on floor, drinking from water bottle, towel on shoulder, calm"
- `sad.png` — "looking down, slightly disappointed but gentle, hands behind back"

Negativos sugeridos: `background, scenery, text, watermark, extra limbs, realistic proportions`

## Enquanto nao houver arte

O componente `<Mascot>` detecta a imagem faltando e renderiza uma silhueta
placeholder. Nada quebra — e so soltar os PNGs aqui que ela aparece.
