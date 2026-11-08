# 🎪 Circus Atari — Web Remaster Edition

Remasterização moderna para navegador do clássico **Circus** do Atari 2600, desenvolvida a partir da engenharia reversa direta da ROM original de 4 KB (`CIRCUS.BIN`, 6502 Assembly).

> **Remaster & Adaptação Web por [@realzurr](https://github.com/realzurr)**

---

## 🎮 Sobre o Jogo

Em **Circus**, você controla uma gangorra no picadeiro e precisa coordenar os saltos de uma dupla de trapezistas para coletar as **60 moedas** que circulam em três fileiras no teto da arena — sem deixar nenhum trapezista cair no chão!

### ✨ Destaques do Remaster
- **Gráficos Modernos HD & Modo Retrô 2600**:
  - **Modo HD Moderno**: Picadeiro iluminado com holofotes animados, cortinas de circo, moedas 3D giratórias, partículas, textos flutuantes de pontuação e trapezistas articulados.
  - **Modo Retrô 2600**: Renderiza os bitmaps originais extraídos diretamente dos endereços `$FD00–$FD62` do binário `CIRCUS.BIN`.
- **Áudio Procedural (Web Audio API)**:
  - Música estilo órgão de circo (*Calliope*) inspirada em *Entry of the Gladiators*.
  - Efeitos sonoros sintetizados em tempo real baseados nos descritores de som originais da ROM (`$F816–$F885`), sem dependência de arquivos externos.
- **Progressão Suave de Velocidade**:
  - O trapezista é sempre lançado no **centro da tela** no início da rodada.
  - A partida inicia com velocidade reduzida (**68%**) para facilitar o ritmo inicial e avança automaticamente para a **velocidade padrão (100% / 60Hz)** assim que metade das moedas do teto (**30 moedas**) são coletadas.

---

## 📜 Regras Extraídas da ROM (`CIRCUS.BIN`)

| Elemento | Endereço na ROM | Regra Original Preservada |
| :--- | :--- | :--- |
| **Fileira Superior (Ouro →)** | `$84–$89` / `$F628` | Gira p/ direita • **10 pts** por moeda • Limpar a fileira: **+100 pts** + **1 Vida Extra** (máx. 5) |
| **Fileira Central (Prata ←)** | `$8A–$8F` / `$F647` | Gira p/ esquerda • **5 pts** por moeda • Limpar a fileira: **+50 pts** |
| **Fileira Inferior (Bronze →)** | `$90–$95` / `$F653` | Gira p/ direita • **2 pts** por moeda • Limpar a fileira: **+20 pts** |
| **5 Curvas de Salto** | `$F900–$F9C8` | Aterrissar na ponta externa da gangorra aumenta o impulso; no meio mantém; perto do centro reduz o impulso e inverte a direção horizontal |
| **Trampolins Laterais** | `$F100–$F12A` | Molas nas laterais esquerda e direita arremessam o trapezista de volta para a arena |
| **Variações de Jogo** | `$F809–$F816` | Modos Clássico, Barreiras Móveis, Super Salto (atravessa moedas) e Limpeza Total (só repõe ao limpar as 3 fileiras) |

---

## 🕹️ Controles

- **Mouse / Toque**: Mova o cursor ou arraste na tela para posicionar a gangorra com precisão (estilo *Paddle* original do Atari).
- **Teclado**: Setas <kbd>←</kbd> <kbd>→</kbd> ou teclas <kbd>A</kbd> <kbd>D</kbd> para mover a gangorra; <kbd>Espaço</kbd> para pausar/continuar.

---

## 🚀 Como Executar Localmente

Basta abrir o arquivo `index.html` diretamente no navegador ou servir a pasta com qualquer servidor estático:

```bash
# Usando Python
python -m http.server 8080

# Ou usando Node.js
npx serve .
```

Depois, acesse `http://localhost:8080`.

---

## 📁 Estrutura do Projeto

- `CIRCUS.BIN` — Binário original de 4096 bytes do Atari 2600 analisado na engenharia reversa.
- `index.html` — Estrutura da página, placar, seletores de variação e modal de regras.
- `style.css` — Estilização moderna responsiva (*Grand Chapiteau*).
- `audio.js` — Sintetizador Web Audio API (música Calliope e efeitos sonoros).
- `game.js` — Motor de física, curvas de salto da ROM, colisões e renderização em Canvas 2D.

---

Desenvolvido por **[realzurr](https://github.com/realzurr)**.
