# Navegador Harmônico

Um instrumento de mesa para caminhar pela harmonia. Você escolhe um acorde, ouve o piano e vê, em anéis geométricos, o que pode vir depois: funções do tom, dominantes secundárias, empréstimos modais e portas para tons vizinhos. Cada clique torna aquele acorde o novo centro.

A interface está em português (Brasil). Não há conta nem servidor: as predefinições ficam no `localStorage` do navegador.

## Como rodar

```bash
npm install
npm run dev
```

O Vite sobe em [http://127.0.0.1:4731](http://127.0.0.1:4731).

```bash
npm test        # testes da camada harmônica
npm run build   # site estático em dist/
```

O build é estático e pode ser publicado na Vercel ou no Cloudflare Pages. O app não faz deploy sozinho.

Na primeira vez, o piano tenta carregar as amostras Salamander (as mesmas usadas com o Tone.js). Se a rede falhar, a escuta cai para um sintetizador. O navegador só libera o áudio depois de um clique.

## Como usar

1. Em **Nova partida**, escolha a fundamental, a qualidade e o tom de referência. **Definir centro** recomeça o caminho nesse acorde.
2. Clique num acorde ao redor para ouvi-lo por cerca de 3 segundos, ver as notas (e o teclado) e torná-lo o centro. O mapa se reorganiza.
3. **Voltar** desfaz o último passo.
4. O **Caminho** é a progressão percorrida. Dê um nome e salve. Em **Predefinições** você carrega, exclui ou toca. **Mais lento** e **Mais rápido** mudam quanto tempo cada acorde dura na reprodução (um acorde = um compasso de 4/4).

O traço mais firme liga o centro a um passo provável a partir da função atual. Passe o cursor sobre um acorde para ler a explicação.

## Modelo harmônico

O tom de referência é maior ou menor. A partir dele o mapa oferece quatro famílias, desenhadas em anéis e cores diferentes:

| Família | Onde fica | O que entra |
| --- | --- | --- |
| Funções diatônicas | anel interno | Tônica (I, iii, vi ou i, III, VI), subdominante (ii, IV ou ii°, iv) e dominante (V, vii°). No menor, o V e o vii° vêm da escala menor harmônica. |
| Dominante secundária | anel do meio, à direita | V7 de cada grau maior ou menor, exceto a tônica e os diminutos. Ex.: em C maior, V7/V = D7. O tom não muda. |
| Empréstimo modal | anel do meio, à esquerda | No maior: iv, bIII, bVI e bVII do menor natural paralelo. No menor: v e VII do modo natural, mais I e IV do maior paralelo. O tom não muda. |
| Modulação | anel externo, e o paralelo no sul do anel interno | Um acorde-porta para o relativo, o paralelo e os vizinhos a uma quinta acima e abaixo no ciclo de quintas (mesmo modo). Esse clique troca o tom. |

O anel externo também mostra o ciclo de quintas a partir da tônica, só como bússola. O acorde do meio do anel externo não é o trítono: o **paralelo** fica no vão sul do anel diatônico, porque não é um vizinho de quinta.

Quando o mesmo símbolo aparece duas vezes, a diferença é o destino. Exemplo em C maior: **Am · vi** permanece em C; **Am · relativo** passa a ser i em A menor. O algarismo romano de cada opção é relativo ao tom *antes* do passo. Depois da modulação, o centro passa a ser lido no tom novo.

Acorde com sétima da dominante (como G7) sugere o tom uma quinta abaixo. Maior e menor sugerem a si mesmos como tônica. Dá para corrigir o tom na partida.

A grafia segue o tom: F# maior usa sustenidos (o vii° é E#°); Bb e Db maior usam bemóis. Algumas dominantes secundárias em tons com muitos sustenidos mostram dobrados (a terça de D#7 é F##). É a grafia correta daquele campo, não um enarmônico “mais fácil”.

## Tecnologias

TypeScript, Vite, React, [Tonal](https://github.com/tonaljs/tonal), Tone.js (Sampler + amostras Salamander, com PolySynth de reserva), SVG, Motion e Zustand.

## Limitações

- O movimento diatônico é em tríades. Sétimas aparecem na partida, nas dominantes secundárias e na análise (V7, IΔ).
- Não há condução de vozes nem ranking além da função do acorde atual. O destaque é uma sugestão, não uma regra.
- Modulações cobrem relativo, paralelo e ±1 quinta. Não há tons distantes, acordes de sexta napolitana nem dominantes estendidas além do V7/grau.
- A reprodução é em temperamento igual, uma oitava de voicing fechado a partir de C3.
- Predefinições são locais a este navegador.
