# Aurora Wilds — Manual de Engenharia e Reprodução

> Documento de transferência de conhecimento para agentes e desenvolvedores que precisem compreender, manter ou reproduzir um jogo de sobrevivência 3D procedural para navegador com o mesmo nível do Aurora Wilds.

## 1. Objetivo deste documento

Este manual registra o que foi aprendido durante a construção iterativa do Aurora Wilds. Ele não é apenas uma lista de funcionalidades. Ele explica:

- qual experiência o jogo pretende entregar;
- quais decisões produziram bons resultados;
- quais tentativas deram errado e por quê;
- como os sistemas se conectam;
- como preservar determinismo, desempenho e testabilidade;
- como implementar uma versão equivalente em uma ordem segura;
- quais dívidas do protótipo atual não devem ser copiadas para uma versão maior;
- como preparar o projeto para multiplayer sem comprometer o single-player atual.

O leitor ideal é outro agente de código que recebeu o repositório sem o histórico da conversa.

## 2. Resumo do produto

Aurora Wilds é um MVP local de sobrevivência 3D em mundo procedural potencialmente infinito. O jogador deve:

1. criar um personagem;
2. explorar um mundo gerado por seed e chunks;
3. coletar madeira, pedra, frutos e carne;
4. fabricar ferramentas, armas, fogueira e peças de construção;
5. construir um abrigo modular com encaixe;
6. sobreviver a fome, temperatura, noite e predadores;
7. explorar biomas, rios, ruínas, acampamentos e cavernas;
8. enfrentar fauna, goblins e golens;
9. salvar o progresso localmente.

O alvo visual é estilizado, colorido e legível, inspirado pela sensação de aventura de jogos como *Breath of the Wild*, sem tentar reproduzir seus assets, personagens ou interface literalmente.

## 3. Pilares de design

Toda nova funcionalidade deve reforçar pelo menos um destes pilares:

### 3.1 Mundo que nasce ao redor do jogador

- O mundo deve parecer maior do que a área carregada.
- A mesma seed precisa produzir o mesmo terreno, recursos e pontos de interesse.
- Chunks devem entrar e sair sem mudanças perceptíveis nas bordas.
- Explorar deve revelar variação de terreno, não apenas planícies repetidas.

### 3.2 Sobrevivência compreensível

- O jogador deve entender o risco antes de sofrer uma punição grave.
- O primeiro dia precisa dar tempo suficiente para aprender e montar uma fogueira.
- Fome, frio e perigo noturno devem criar decisões, não apenas esvaziar barras.
- Ferramentas corretas devem reduzir esforço de maneira evidente.

### 3.3 Construção assistida, não frustrante

- Perto de uma conexão válida, o jogo deve sugerir o encaixe correto.
- Fundações formam pisos; paredes conectam nas bordas e podem ser empilhadas.
- Tetos conectam entre si e no topo de paredes.
- Rampas e escadas conectam às laterais das fundações.
- Sustentação deve impedir estruturas flutuantes sem transformar a construção em um quebra-cabeça de precisão.

### 3.4 Controles de console desde o início

- Tudo que pode ser feito com mouse deve ter caminho equivalente no DualSense.
- Direcionais em menus representam direção espacial real: cima, baixo, esquerda e direita.
- O jogador não deve precisar simular um cursor com o controle.
- Ações importantes precisam de feedback visual e, quando apropriado, vibração.

### 3.5 Leitura visual acima de realismo

- Silhuetas e cores devem comunicar função.
- O personagem, inimigos, recursos e pontos de interesse precisam ser reconhecíveis à distância.
- Luz estilizada não pode esconder informações essenciais.
- Dungeons podem ser escuras, mas nunca injogáveis.

## 4. Stack usada

O projeto atual usa:

- Next.js 16 e React 19 para a casca da aplicação e HUD;
- vinext/Vite para desenvolvimento e build;
- Three.js para cena, modelos procedurais, materiais, câmera e pós-processamento;
- Rapier `@dimforge/rapier3d-compat` para física e controlador cinemático;
- CSS para menus, HUD e criador de personagem;
- `localStorage` para save, aparência e configurações;
- testes nativos do Node para regras headless;
- ESLint e build como gates de qualidade.

O projeto não usa R3F atualmente. As regras de R3F continuam úteis como princípios arquiteturais, mas devem ser traduzidas para Three.js direto:

- somente o engine possui o frame loop;
- UI não contém simulação;
- regras puras ficam fora da cena;
- refs e objetos Three são apresentação, não a fonte de verdade do gameplay.

## 5. Mapa atual do código

```text
app/
  game/
    GameShell.tsx                  UI, HUD, menus e bridge React ↔ engine
    engine.ts                     inicialização, loop, física e integração dos sistemas
    art.ts                        céu, paleta, toon gradient e vento
    models.ts                     rig procedural do jogador, equipamentos e animação
    foliage.ts                    árvores, arbustos, pedras e assets compartilhados
    grass.ts                      geometria instanciada, shader e interação da grama
    survival-world.js             terreno, chunks, rio, biomas e pontos de interesse
    motion.js                     movimento planar e rotação pelo caminho curto
    locomotion.js                 poses de caminhada e corrida
    climbing.js                   regra de escalada, stamina e pose
    attack-pose.js                poses de ataque por arma e etapa do combo
    combat-combo.js               buffer e sequência de três golpes
    harvesting.js                dano e rendimento de recursos
    fauna.js                     geração e intenção básica dos animais
    inventory.js                 hotbar, equipamento e armas carregadas
    crafting.js                  receitas e consumo de materiais
    building.js                  catálogo, snap, bloqueio, suporte, reparo e refund
    world-time.js                ciclo de dia/noite e próximo amanhecer
    minimap.js                   conversão de coordenadas e orientação
    menu-navigation.js           navegação lógica em grids
    save-game.js                 normalização e versão do save
    settings.ts                  qualidade, grama, sombras, bloom e controle
    character-customization.js   aparência, validação e persistência
tests/
  *.test.mjs                     contratos headless de cada domínio
```

### 5.1 Dívida arquitetural mais importante

`engine.ts` concentra integração demais. Isso foi aceitável para validar rapidamente o MVP, mas não é o formato recomendado para uma expansão grande.

Uma reprodução nova deve manter o mesmo comportamento, mas separar gradualmente:

```text
core/
  config/
  world/
  movement/
  combat/
  survival/
  inventory/
  building/
  fauna/
platform/
  input/
  persistence/
view/
  three/
  hud/
app/
  game-loop/
```

A refatoração deve ser incremental. Não reescrever todos os sistemas de uma vez e não introduzir ECS apenas por estética arquitetural.

## 6. Princípios de arquitetura que devem ser preservados

### 6.1 Estado tem um dono

Para qualquer campo, responda antes de editar:

- quem é a fonte de verdade?
- quem pode escrever?
- quem apenas lê?
- o valor é persistente, transitório ou visual?

Exemplos atuais:

- saúde, fome, posição e inventário pertencem ao engine;
- tela aberta, seleção de menu e mensagens visuais pertencem ao React;
- posição corrigida pela física pertence ao corpo Rapier e é sincronizada para Three;
- aparência persistida pertence ao serializer de customização e é aplicada ao rig;
- shader time e vento são estado visual, não gameplay.

### 6.2 Simulação contínua usa estado; acontecimentos usam eventos/callbacks

Use atualização contínua para:

- movimento;
- física;
- animação;
- fome;
- IA;
- ciclo temporal;
- streaming de chunks.

Use eventos ou callbacks para:

- dano recebido;
- toast solicitado;
- morte;
- abertura de inventário;
- som ou vibração;
- item coletado;
- save solicitado.

Eventos dizem “algo aconteceu”. Estado diz “algo é verdadeiro agora”.

### 6.3 UI envia intenção, não executa regra

Correto:

```ts
game.craft(recipeId)
game.equipWeapon(itemId)
game.startBuilding(pieceId)
```

Incorreto:

```ts
// Dentro de um botão React
wood -= 3
inventory.push("axe")
```

### 6.4 Lógica cara ou arriscada deve ser headless

As seguintes regras devem continuar testáveis sem WebGL, DOM ou Rapier:

- geração procedural;
- crafting;
- inventário;
- combo;
- dano de coleta;
- navegação de menu;
- snap e sustentação;
- save/load;
- relógio;
- orientação do minimapa;
- decisões básicas da fauna.

## 7. Game loop e ordem de atualização

O loop atual possui um único `requestAnimationFrame`. Essa centralização deve ser preservada.

Ordem conceitual recomendada:

1. calcular `delta` limitado;
2. ler teclado e gamepad;
3. se o jogo estiver ativo, consumir comandos;
4. atualizar movimento desejado;
5. resolver personagem no Rapier;
6. sincronizar transformações;
7. atualizar combate e impactos;
8. atualizar IA e projéteis;
9. atualizar interações próximas;
10. atualizar sobrevivência e relógio;
11. atualizar câmera;
12. atualizar iluminação e ambiente;
13. atualizar efeitos visuais, grama e vento;
14. emitir snapshot de UI em frequência limitada;
15. salvar quando necessário;
16. renderizar.

### 7.1 Pausa

Quando pausado:

- fome, dano, IA e tempo não avançam;
- a cena ainda renderiza;
- iluminação e efeitos estritamente visuais podem continuar;
- criador de personagem pode trocar materiais e girar o modelo;
- timers de gameplay devem usar `delta` do jogo, nunca `setTimeout`.

### 7.2 Delta e estabilidade

Limite deltas grandes, por exemplo a aproximadamente 33 ms. Uma aba que voltou do background não pode aplicar vários segundos de gravidade, fome ou dano de uma vez.

Para uma versão multiplayer ou mais rigorosamente determinística, use acumulador com tick fixo para simulação e delta variável apenas para apresentação.

## 8. Mundo procedural infinito

### 8.1 Identidade determinística

Constantes atuais:

```text
WORLD_SEED = 834221
CHUNK_SIZE = 32
CHUNK_SEGMENTS = 12
CHUNK_LOAD_RADIUS = 2
WATER_LEVEL = -1.25
```

Uma coordenada de chunk e uma seed precisam determinar:

- terreno;
- recursos;
- grama;
- flores;
- fauna;
- pontos de interesse.

Nunca use `Math.random()` para conteúdo persistente. Use PRNG derivado de uma chave como:

```text
seed + chunkX + chunkZ + domínio + índice
```

Domínios diferentes devem usar sub-seeds diferentes para que alterar árvores não reorganize a fauna.

### 8.2 Continuidade entre chunks

O erro mais perigoso é gerar altura apenas com coordenadas locais. A função de altura deve receber coordenadas globais:

```ts
terrainHeightAt(chunkOriginX + localX, chunkOriginZ + localZ)
```

Chunks vizinhos então consultam exatamente a mesma função na borda.

Teste obrigatório: duas bordas vizinhas devem produzir as mesmas alturas dentro de uma tolerância pequena.

### 8.3 Streaming

Ao mover o jogador:

1. converta a posição global para chunk;
2. calcule o quadrado visível ao redor;
3. carregue coordenadas ausentes;
4. descarregue coordenadas fora do raio;
5. crie e destrua juntos meshes, instâncias, colliders, fauna e POIs;
6. descarte geometrias e materiais que não são compartilhados.

Nunca deixe colliders de chunks descarregados no mundo Rapier.

### 8.4 Terreno interessante

Planícies puras ficam repetitivas. Combine frequências diferentes:

- ondulação ampla para relevo regional;
- ruído médio para colinas;
- detalhe baixo para quebrar superfícies;
- campo de montanhas com máscara de distância da origem;
- escavação do leito do rio;
- zonas iniciais seguras e suaves.

Montanhas devem surgir longe do spawn para não bloquear o onboarding.

### 8.5 Biomas

Biomas atuais incluem campos, florestas, regiões fluviais e terras altas. Cada bioma deve alterar um conjunto coerente:

- cor do terreno;
- densidade e tipo de vegetação;
- fauna;
- recursos;
- temperatura;
- silhueta do horizonte;
- probabilidade de POIs.

Evite trocar apenas a cor. Um bioma precisa mudar decisões de gameplay.

### 8.6 Rio e água

O rio é uma função contínua no eixo global. A distância até o centro do rio define:

- altura escavada do terreno;
- presença da lâmina de água;
- remoção de grama;
- chance de pesca;
- bioma ribeirinho.

Água deve ser consequência da mesma função usada para o terreno; duas representações independentes criam margens quebradas.

## 9. Vegetação densa com desempenho aceitável

### 9.1 Instancing

Milhares de tufos de grama não podem ser milhares de meshes individuais. Use `InstancedMesh` e uma geometria compartilhada.

O budget atual de referência é até 1.600 tufos por chunk no modo denso. Configurações devem mapear para:

- nenhuma: zero instâncias;
- pouca: budget reduzido;
- muita: cobertura densa.

### 9.2 Distribuição orgânica

Espalhar tufos uniformemente cria “confete”. O resultado melhor veio de uma máscara contínua de fertilidade:

1. calcule ruído de baixa frequência para formar regiões;
2. aplique smoothstep para transições graduais;
3. misture ruído menor para quebrar bordas;
4. force densidade alta no interior dos campos;
5. force zero em água, rocha exposta ou áreas inadequadas;
6. compare um valor determinístico por instância com a densidade local.

Isso produz áreas completamente preenchidas, bordas que perdem frequência gradualmente e clareiras sem cortes artificiais.

### 9.3 Cor

Grama quase preta sobre chão verde escuro destrói profundidade. Preserve contraste por luminosidade e temperatura:

- chão: verde médio menos saturado;
- base da lâmina: verde mais escuro, mas ainda colorido;
- ponta: verde-amarelo iluminado;
- névoa: reduz contraste à distância;
- noite: não multiplique cores até virar preto puro.

### 9.4 Vento e interação

O shader recebe:

- tempo;
- posição atual do jogador;
- posição suavizada anterior;
- velocidade horizontal;
- peso por vértice, maior na ponta da lâmina.

Cada lâmina combina vento global com afastamento local. A base quase não se move; a ponta recebe a deformação completa. O rastro suavizado evita uma bolha rígida acompanhando o jogador.

## 10. Direção de arte e iluminação

### 10.1 Materiais

O projeto usa `MeshToonMaterial` com gradient map compartilhado. Benefícios:

- leitura clara em modelos low-poly;
- custo menor que materiais complexos;
- paleta controlável;
- sombras estilizadas.

### 10.2 Céu e ciclo solar

O céu deve variar por horário usando uma função contínua, não trocas abruptas. Sol, hemispheric light, fog e paleta do céu devem concordar.

O sol se move em arco e atualiza:

- direção;
- intensidade;
- cor;
- sombras;
- paleta do céu;
- exposição percebida.

### 10.3 Dungeons

Escuridão deve criar atmosfera, não remover informação. Uma dungeon jogável precisa de:

- ambient light mínima;
- luz do jogador ou luz de preenchimento;
- tochas nas paredes em ritmo previsível;
- fog curta, mas não opaca;
- materiais que ainda mantenham diferença entre piso, parede, inimigo e saída;
- teto removido ou transparente quando a câmera elevada puder colidir visualmente com ele.

### 10.4 Criador de personagem

Não use a luz solar normal em close-up. Cabelo, nariz, gola e ombros produzem sombras duras e manchas no rosto.

O criador atual usa iluminação dedicada:

- ambient warm fill;
- key light frontal quente;
- rim light azul-esverdeada;
- shadow casting do sol desligado apenas no preview;
- sombras normais restauradas ao sair.

Regra geral: gameplay e inspeção de personagem possuem necessidades de iluminação diferentes.

## 11. Personagem procedural e rig

O personagem atual é montado com primitivas Three.js. Isso permitiu prototipar sem depender de um pipeline externo de Blender/GLTF.

O rig mantém referências explícitas para:

- tronco e upper body;
- cabeça;
- braços, antebraços e mãos;
- pernas e canelas;
- socket da arma;
- duas armas nas costas;
- ponto de pegada da mão secundária;
- tecido da túnica;
- cabelo/antena;
- materiais de pele e cabelo;
- cinco grupos de penteado.

### 11.1 Customização

Customizações atuais:

- cinco formatos de cabelo;
- qualquer cor de cabelo;
- qualquer tom de pele;
- persistência local;
- aplicação em tempo real no preview e no modelo jogável.

Todos os meshes de pele compartilham um material. Todos os cabelos usam material principal e material de sombra. Trocar a aparência deve atualizar materiais compartilhados e alternar visibilidade dos grupos, não recriar o modelo inteiro.

Dados externos do `localStorage` sempre passam por normalização:

- estilo limitado ao intervalo disponível;
- cores aceitas apenas no formato hexadecimal esperado;
- fallback seguro para dados ausentes ou corrompidos.

### 11.2 Quando migrar para GLTF

Primitivas são ótimas para o MVP, mas roupas detalhadas, cabelos flexíveis e animações profissionais justificam GLTF com esqueleto. A migração deve preservar o contrato lógico do rig:

- sockets de mão e costas;
- nomes de clips;
- estados de locomotion/combat;
- materiais customizáveis;
- bounding box e ground offset.

## 12. Movimento e animação

### 12.1 Rotação pelo caminho curto

Interpolar ângulos diretamente pode fazer o personagem dar quase uma volta completa ao cruzar `-π/π`. Normalize a diferença para o intervalo `[-π, π]` antes de interpolar.

Teste obrigatório: virar de uma direção próxima de 180° para a equivalente negativa deve escolher o caminho curto.

### 12.2 Movimento com inércia controlada

O movimento atual não define posição diretamente. Ele converge uma velocidade planar para o alvo:

- aceleração no chão;
- controle reduzido no ar;
- atrito ao soltar;
- reversão que precisa vencer a velocidade atual;
- sprint com limite próprio;
- instabilidade após aterrissagens fortes.

Isso evita o aspecto de personagem deslizando instantaneamente em qualquer direção.

### 12.3 Caminhada e corrida diferentes

A corrida não deve ser apenas a caminhada acelerada. Ela precisa alterar:

- frequência;
- amplitude da passada;
- inclinação do tronco;
- movimento dos braços;
- flexão de joelhos;
- deslocamento vertical do corpo.

### 12.4 Joelhos

O joelho deve dobrar no eixo anatômico correto. Limite poses e teste numericamente a faixa das juntas. Se a canela dobra para frente ou para o lado, o problema está na orientação local do pivot, não apenas no valor do ângulo.

### 12.5 Ataque e IK aproximado

Os primeiros ataques rotacionavam o braço em círculo e atravessavam o tronco. O resultado melhor veio de:

- ataque dividido em preparação, impacto e recuperação;
- tronco participando do golpe;
- cotovelo estendendo em direção ao alvo;
- passos alternando lados;
- arma travada durante toda a sequência;
- mão secundária buscando um ponto de pegada na ferramenta;
- limites anatômicos testados.

O IK atual é analítico e simples para dois segmentos. Para qualidade maior, use um esqueleto e solver dedicado, mas preserve a ideia de alvo de mão secundária.

### 12.6 Lança e equipamentos

- A arma ativa fica na mão.
- Até duas ferramentas/armas são lembradas.
- A não utilizada fica nas costas.
- Sem arma ativa, as duas podem ficar cruzadas nas costas.
- A lança em idle deve ficar horizontal ou em posição que não atravesse o chão.
- O modelo visual nunca deve decidir qual item está equipado; ele apenas recebe a decisão do inventário.

## 13. Combate e combo

O combo possui três passos e buffer de entrada:

1. pressionar ataque inicia o primeiro golpe;
2. uma entrada durante a janela válida fica armazenada;
3. ao finalizar, o próximo golpe começa se houver buffer;
4. após o terceiro golpe ou expiração, o combo é encerrado.

Cada arma possui:

- estilo de pose;
- duração;
- instante de impacto;
- dano;
- alcance;
- uso de uma ou duas mãos.

O dano acontece uma única vez quando o progresso cruza o instante de impacto. Não use colisão visual contínua sem um controle de “impacto já resolvido”, ou o mesmo golpe causará dano a cada frame.

O terceiro golpe deve ser mais longo e pesado para comunicar finalização.

## 14. Coleta e ferramentas

Árvores e rochas possuem vida. Um golpe:

1. orienta o personagem para o recurso;
2. inicia a animação correta;
3. resolve dano no instante de impacto;
4. gera drops proporcionais ao dano útil;
5. reduz durabilidade da ferramenta;
6. remove o recurso ao chegar a zero.

Ferramentas corretas causam mais dano:

- machado em árvore;
- picareta em rocha.

O rendimento total não deve aumentar acidentalmente só porque o dano por golpe aumentou. O ganho deve ser limitado à vida restante do recurso.

## 15. Inventário, hotbar e equipamento

### 15.1 Hotbar

O padrão atual tem nove slots, inspirado em jogos de sobrevivência:

- seleção clara;
- quantidade no canto;
- durabilidade como barra;
- slots vazios visíveis;
- navegação por números, scroll e `L1/R1`.

Recursos não devem aparecer como três medidores independentes na HUD. Eles são itens e pertencem ao inventário/hotbar.

### 15.2 Inventário

O inventário deve ser um grid simples:

- clicar ou navegar com direcionais;
- selecionar item;
- atribuir ao slot da hotbar;
- equipar arma/ferramenta;
- mostrar personagem e slots de roupa;
- não transformar a tela em um painel administrativo.

### 15.3 Navegação espacial

Em grids:

- esquerda/direita mudam coluna;
- cima/baixo mudam linha;
- última linha incompleta escolhe o item válido mais próximo;
- a direção não depende da orientação do personagem ou da câmera.

Para layouts irregulares, escolha o próximo elemento por retângulos de tela e direção, não por uma lista linear.

### 15.4 Roupas futuras

Slots já previstos:

- cabeça;
- torso;
- pernas;
- pés.

Próxima evolução recomendada:

- resistência ao frio;
- resistência ao calor;
- armadura;
- aparência refletida no modelo;
- receitas e materiais por bioma.

## 16. Crafting

Receitas são dados, não condicionais espalhados pela UI. Cada definição deve conter:

- id;
- nome;
- descrição;
- custos;
- resultado;
- categoria ou estação, quando existir.

Fluxo correto:

1. consultar receita por id;
2. validar inventário;
3. retornar sem mutação quando faltarem materiais;
4. consumir custos;
5. adicionar resultado;
6. emitir feedback;
7. salvar.

Não confie em botão desabilitado como regra. O engine deve validar novamente.

## 17. Construção modular

### 17.1 Catálogo atual

O protótipo trabalha com peças como:

- fundação;
- parede;
- porta;
- teto plano;
- teto inclinado;
- escada;
- rampa;
- cama;
- baú.

### 17.2 Snap

O snap não deve ser apenas arredondamento de grid. Ele é contextual:

- fundação → vizinho lateral;
- parede → borda de fundação, lateral de parede ou topo de parede;
- teto → topo de parede ou lateral de outro teto;
- escada/rampa → lateral de fundação;
- teto inclinado → orientação compatível com apoio e vizinho.

Algoritmo recomendado:

1. gere candidatos compatíveis a partir das estruturas próximas;
2. descarte candidatos além do raio;
3. calcule distância ao cursor/projeção do jogador;
4. aplique prioridade semântica; por exemplo, teto existente antes de uma fundação abaixo;
5. escolha o candidato de melhor score;
6. valide footprint e sustentação;
7. mostre nome do snap na UI.

### 17.3 Footprint e conexões

Uma colisão de footprint genérica pode bloquear peças que deveriam compartilhar borda. Regras precisam conhecer o tipo de conexão:

- tetos adjacentes podem compartilhar beiral;
- paredes podem tocar fundações;
- portas substituem/ocupam uma posição de parede;
- peças em alturas diferentes não colidem apenas porque `x/z` coincidem.

### 17.4 Sustentação

Uma peça é suportada quando existe uma cadeia válida até o chão/fundação. Ao desmontar:

1. simule a remoção;
2. descubra peças que perderiam suporte;
3. impeça ou derrube conforme a regra do jogo;
4. recupere uma fração configurada dos materiais.

### 17.5 Reparar, desmontar e atacar estruturas

- Martelo próximo a uma estrutura danificada realiza reparo mediante custo.
- Desmontar devolve parte dos materiais.
- Predadores noturnos podem atacar paredes e portas.
- Portas possuem estado aberto/fechado e collider coerente com o visual.
- Vida de estrutura deve ser persistida.

## 18. Sobrevivência, tempo e descanso

Referência atual:

```text
dia = 8 minutos reais
noite = 4 minutos reais
ciclo = 12 minutos reais
```

O primeiro dia originalmente era rápido demais. A lição é medir o tempo necessário para um jogador novato:

1. entender os controles;
2. encontrar madeira e pedra;
3. coletar recursos;
4. abrir crafting;
5. fabricar uma fogueira;
6. posicioná-la antes do anoitecer.

O relógio deve ser testado como função pura. Dormir durante a noite avança exatamente ao próximo amanhecer.

Formas de dormir:

- cama construída, que também pode definir respawn;
- ação próxima à fogueira, se a regra de design permitir.

O descanso não deve funcionar durante o dia sem uma mensagem clara.

## 19. Fauna, inimigos e eventos noturnos

Tipos atuais incluem herbívoros, javalis, predadores, ursos, golens e goblins.

### 19.1 Intenção simples e legível

- herbívoro: vaga e foge;
- predador: patrulha, persegue e ataca;
- animal provocado: mantém agressividade temporária;
- golem: lento, resistente e lança rochas;
- goblin: inimigo de dungeon.

O jogador deve ter tempo de ler a preparação do ataque.

### 19.2 Morte definitiva no runtime

Um inimigo morto não pode continuar no loop invisível. Ao morrer:

- marcar estado morto imediatamente;
- impedir IA, contato e ataque;
- esconder ou animar o modelo;
- remover do array/entidade após o tempo de morte;
- registrar id derrotado quando necessário;
- descartar objetos visuais e colliders.

O bug do “lobo fantasma” aconteceu porque o visual foi removido antes de todas as rotinas deixarem de considerar o animal ativo.

### 19.3 Spawn justo

- Não colocar predadores perto da origem.
- Não colocar inimigos na porta da dungeon.
- Eventos noturnos podem aproximar ameaças, mas precisam respeitar distância mínima.
- Spawns devem validar água, terreno e espaço.

### 19.4 Projétil do golem

Projéteis rápidos ou grandes devem testar o segmento percorrido entre frames, não apenas a posição final. Isso evita atravessar o jogador por tunneling.

## 20. Exploração e dungeons

### 20.1 Pontos de interesse

O mundo possui ruínas, cavernas e acampamentos. Recompensas devem ser persistentes:

- antes de coletar: brilho visível;
- após coletar: estrutura permanece, brilho desaparece;
- save registra o POI visitado;
- o cenário não some junto com o item.

### 20.2 Dungeons

Uma dungeon não deve ser apenas um corredor quadrado. Requisitos mínimos:

- múltiplos caminhos;
- pelo menos uma bifurcação real;
- atalhos ou loop;
- sala de recompensa;
- entrada segura;
- landmarks visuais;
- iluminação por tochas;
- limites fechados;
- piso e paredes cobrindo todos os caminhos possíveis;
- retorno à superfície seguro.

### 20.3 Limbo e retorno

Toda borda aberta precisa de parede/collider ou barreira de segurança. Ainda assim, mantenha fallback:

- detectar queda abaixo do piso da caverna;
- reposicionar ou derrotar de forma controlada;
- ao retornar à superfície, calcular `safeSurfaceReturn` acima do terreno atual;
- zerar velocidade vertical;
- sincronizar corpo Rapier e grupo visual;
- aplicar breve margem de segurança antes de dano por queda.

O retorno não pode reutilizar uma altura antiga sem consultar o terreno, pois a saída pode estar sobre relevo diferente.

### 20.4 Câmera e teto

Em câmera elevada, um teto opaco entre câmera e personagem bloqueia toda a visão. Opções:

- não renderizar teto;
- tornar teto transparente quando o jogador está dentro;
- usar recorte por distância/câmera;
- trocar para câmera interna adequada.

Para o MVP atual, remover o teto é a solução mais confiável.

## 21. Escalada

Escalada é consequência necessária de montanhas exploráveis. Para iniciar, valide:

- jogador está segurando o comando;
- existe movimento em direção à superfície;
- inclinação/elevação sugere parede;
- stamina é maior que zero;
- estado atual permite escalada.

Durante escalada:

- drenar stamina por segundo;
- reduzir/alterar gravidade;
- orientar personagem à parede;
- aplicar pose própria de braços e pernas;
- impedir ataques incompatíveis;
- soltar ao zerar stamina.

Ao descansar no chão, stamina recupera gradualmente.

## 22. Minimapa e convenções de coordenadas

Escolha uma convenção e escreva testes antes de ajustar CSS.

No Aurora Wilds:

- norte aparece no topo;
- leste deve aparecer à direita;
- oeste deve aparecer à esquerda;
- o jogador fica no centro;
- a ponta do triângulo representa a frente do personagem;
- marcadores usam posição relativa dentro de um range.

Erros anteriores vieram de inverter `x` ao transformar coordenadas do mundo em percentuais e de aplicar um offset de rotação incompatível com o triângulo CSS.

Teste quatro casos cardinais:

- norte;
- sul;
- leste;
- oeste.

Não tente corrigir simultaneamente posição dos marcadores e heading; são transformações diferentes.

## 23. HUD e menus

### 23.1 Hierarquia da HUD

A tela durante gameplay deve priorizar:

1. saúde/fome e risco imediato;
2. item selecionado e hotbar;
3. prompt de interação;
4. objetivo contextual;
5. tempo, temperatura e minimapa;
6. ajuda de controles.

Evite painéis grandes cobrindo o mundo. A imagem do jogo e a silhueta do personagem já fazem parte da interface.

### 23.2 Tela inicial

Não use arte que contradiga o jogo. A primeira versão reutilizava uma imagem com robô que não representava o projeto. A solução foi usar o próprio mundo 3D pausado como fundo e sobrepor apenas identidade, descrição e CTA.

### 23.3 Criador de personagem

Fluxo:

1. detectar se existe aparência salva;
2. primeira entrada abre o criador;
3. mudanças são aplicadas ao preview em tempo real;
4. confirmação normaliza e salva;
5. próximas entradas vão direto ao jogo;
6. futuramente, um espelho na base pode permitir reedição.

Controles:

- mouse/click;
- teclado com direcionais e Enter;
- DualSense com direcionais, `✕`, `○` e `L1/R1` para girar.

## 24. DualSense e input

### 24.1 Separar gameplay de menu

O engine lê controle durante gameplay. A casca React lê controle quando um menu está aberto. Apenas um deles deve consumir a ação em cada estado.

### 24.2 Edge detection

Menus precisam agir no momento em que o botão passa de solto para pressionado. Guardar o conjunto anterior evita repetir uma ação a cada frame enquanto o botão está segurado.

### 24.3 Deadzone

Analógicos precisam de deadzone radial e remapeamento da magnitude restante. Sem isso, drift move personagem/câmera; com corte simples, a resposta começa abruptamente.

### 24.4 Mapeamento atual conceitual

- analógico esquerdo: movimento;
- analógico direito: câmera;
- `L1/R1`: slots ou rotação no criador;
- `□`: interagir/coletar;
- `△`: atacar/usar/reparar;
- `✕`: pular/segurar para escalar ou confirmar em menu;
- `○`: voltar/dormir conforme contexto;
- touchpad: inventário;
- Options: pausa;
- R3: desmontar;
- L2/R2: abas, rotação ou ações contextuais de menu.

Mostre o mapeamento ativo na tela quando um controle for detectado.

### 24.5 Vibração

Use vibração curta e proporcional para:

- mudança de slot;
- acerto;
- dano recebido;
- construção confirmada;
- ação negada importante.

Respeite a configuração de intensidade e ausência de `vibrationActuator`.

## 25. Persistência

O save usa versão explícita e normalizador. Isso é obrigatório porque o jogo muda durante o desenvolvimento.

Persistir apenas dados de domínio:

- recursos e inventário;
- ferramentas e durabilidade;
- hotbar e equipamentos;
- tempo de sobrevivência;
- estruturas, vida, estado e armazenamento;
- fogueiras;
- POIs visitados;
- recursos coletados;
- inimigos persistentes derrotados, quando aplicável;
- posição/respawn quando seguro.

Não persistir:

- objetos Three;
- corpos Rapier;
- materiais;
- timers visuais;
- refs;
- caches de chunk.

Configurações e aparência podem usar chaves separadas porque possuem ciclo de vida diferente do save da expedição.

Ao carregar:

1. fazer parse em `try/catch`;
2. verificar versão;
3. normalizar arrays, strings e números;
4. aplicar defaults para campos novos;
5. rejeitar valores impossíveis;
6. reconstruir runtime a partir dos dados.

## 26. Desempenho

### 26.1 Maiores custos

- grama densa;
- sombras;
- chunks e colliders;
- fauna ativa;
- pós-processamento;
- criação/descarte frequente de objetos;
- snapshots React em alta frequência.

### 26.2 Estratégias aplicadas

- instancing de grama e flores;
- geometrias e materiais de foliage compartilhados;
- raio limitado de chunks;
- snapshot da HUD desacoplado do frame rate;
- pixel ratio por qualidade;
- sombras e bloom configuráveis;
- determinismo para regenerar conteúdo em vez de armazenar tudo;
- descarte explícito ao remover chunks/objetos.

### 26.3 Próximas otimizações

- pool de drops, projéteis e efeitos;
- spatial partitioning para nearest queries;
- LOD de árvores e pedras;
- separar simulação fixa de apresentação;
- reduzir alocações de `Vector3` em loops quentes;
- mover geração pesada de chunks para worker;
- dividir bundle do Three.js e telas pesadas.

Não micro-otimize antes de medir. Primeiro verifique se algo está atualizando ou renderizando mais vezes do que deveria.

## 27. Testes e gates

Comandos obrigatórios antes de entregar mudanças:

```bash
npm run build
npm run lint
npm test
```

O conjunto atual cobre contratos como:

- terreno determinístico e bordas de chunks;
- continuidade de rio e distribuição de grama;
- tempo de dia/noite e sono;
- shortest-path de rotação;
- física de aceleração, atrito e ar;
- joelhos e diferenças entre corrida/caminhada;
- poses, impacto e limites anatômicos dos ataques;
- combo com buffer;
- dano e rendimento de coleta;
- inventário, hotbar, roupas e duas armas;
- crafting sem consumo inválido;
- snap, footprint, teto, suporte, reparo e refund;
- fauna determinística, spawn seguro e morte;
- navegação livre de menu;
- cardinais do minimapa;
- save e aparência corrompida;
- retorno seguro da caverna;
- identidade renderizada da aplicação.

### 27.1 Regra para regressões

Todo bug que pode reaparecer como regra pura deve ganhar teste antes ou junto da correção.

Exemplos reais:

- “baixo” navegava para direita;
- leste/oeste estavam invertidos no minimapa;
- animal invisível continuava atacando;
- teto não conectava em um dos lados;
- personagem girava quase 360°;
- dia terminava antes do jogador fabricar fogueira.

## 28. Erros já cometidos e lições

### 28.1 Painel inicial grande demais

Problema: cobriu a imagem e repetiu informações que o cenário já comunicava.

Lição: a primeira tela precisa de identidade e uma ação principal, não de explicar todo o jogo.

### 28.2 Arte de abertura sem relação com o produto

Problema: robô na imagem sugeria outro jogo.

Lição: use captura/arte coerente ou o próprio mundo 3D.

### 28.3 Recursos como HUD fixa

Problema: parecia que só existiam três recursos.

Lição: materiais são itens; use hotbar e inventário extensíveis.

### 28.4 Ataque só rotacionando braço

Problema: braço atravessava corpo e ferramenta fazia arco artificial.

Lição: ataque é pose corporal com fases, footwork, tronco, cotovelo e grip.

### 28.5 Corrida como animação acelerada

Problema: personagem parecia apenas andar mais rápido.

Lição: corrida precisa de pose e cadência próprias.

### 28.6 Grama distribuída uniformemente

Problema: grandes buracos repetitivos ou tufos em padrão.

Lição: use campos de densidade contínuos com transições orgânicas.

### 28.7 Grama escura demais

Problema: lâminas pareciam pretas contra o chão.

Lição: preserve luminância e matiz mesmo nas sombras.

### 28.8 Snap somente por grid

Problema: tetos e paredes não sabiam qual conexão semântica usar.

Lição: snap deve gerar candidatos por tipo de peça e prioridade.

### 28.9 Dungeon escura, aberta e com teto

Problema: falta de luz, queda no limbo e câmera bloqueada.

Lição: jogabilidade, limites e câmera são requisitos estruturais da dungeon, não polimento.

### 28.10 Preview usando luz do mundo

Problema: sombras duras e manchas no rosto do personagem.

Lição: telas de inspeção precisam de rig de luz próprio.

## 29. Ordem recomendada para reproduzir o projeto

### Fase 0 — Contratos

- Definir pilares, controles, seed e convenção de eixos.
- Criar config central.
- Preparar build, lint e testes.
- Desenhar separação core/view/platform.

**Saída:** projeto vazio compilando e regras documentadas.

### Fase 1 — Vertical slice de movimento

- Cena Three, câmera e luz.
- Rapier e controlador cinemático.
- Terreno único.
- Personagem simples.
- Movimento, rotação curta, corrida e câmera.
- Teclado e DualSense.

**Saída:** personagem agradável de controlar em uma área pequena.

### Fase 2 — Mundo por chunks

- Altura global determinística.
- Chunk mesh e collider.
- Streaming.
- Recursos determinísticos.
- Fog, céu e bordas testadas.

**Saída:** exploração contínua sem costuras.

### Fase 3 — Loop de sobrevivência

- Coleta com vida e drops.
- Inventário e hotbar.
- Crafting de machado, picareta e fogueira.
- Fome e ciclo dia/noite de oito/quatro minutos.
- Save versionado.

**Saída:** jogador sobrevive à primeira noite.

### Fase 4 — Vegetação e identidade visual

- Materiais toon.
- Grama instanciada.
- Campos densos e clareiras orgânicas.
- Vento e interação.
- Configuração nenhuma/pouca/muita.

**Saída:** mundo reconhecível e performático.

### Fase 5 — Combate e fauna

- Rig explícito.
- Locomotion e corrida próprias.
- Ataques por fases.
- Combo de três passos.
- Animais com intenções simples.
- Golem e projéteis por segmento.

**Saída:** combate legível sem atravessamentos graves.

### Fase 6 — Construção

- Catálogo data-driven.
- Preview válido/inválido.
- Snap contextual.
- Sustentação.
- Reparar, desmontar, portas, rampas, escadas e telhados.
- Predadores atacando estruturas.

**Saída:** abrigo funcional e expansível.

### Fase 7 — Exploração

- Biomas.
- Rios e pesca.
- Ruínas e acampamentos persistentes.
- Montanhas e escalada.
- Dungeon grande, iluminada, fechada e sem teto bloqueando câmera.

**Saída:** razões concretas para deixar a base.

### Fase 8 — UX e identidade

- Tela inicial coerente.
- Criador de personagem.
- Inventário simples com personagem.
- Navegação espacial completa.
- Minimapa testado nos quatro cardinais.
- Feedback de controle e vibração.

**Saída:** experiência apresentável sem explicação externa.

### Fase 9 — Polimento e progressão

- Roupas e temperatura.
- Materiais pedra/cobre/ferro.
- Bancadas.
- Variação de loot.
- Áudio, VFX, acessibilidade e balanceamento.

**Saída:** jogo com progressão, não apenas sandbox de sistemas.

## 30. Preparação para multiplayer com Colyseus

Multiplayer não está implementado. Não adicionar rede antes de estabilizar o domínio headless.

Quando chegar a hora:

### 30.1 Autoridade

Servidor deve ser autoridade de:

- saúde e morte;
- inventário e crafting;
- estruturas;
- fauna e dano;
- ciclo do mundo;
- loot e POIs;
- seed e versão de geração.

Cliente pode ser responsável por:

- input local;
- predição de movimento;
- câmera;
- animação e cosméticos;
- interpolação de entidades remotas.

### 30.2 Sala Colyseus

Uma room pode representar um mundo/seed. O estado sincronizado deve conter dados compactos, não objetos Three ou Rapier.

Mensagens representam comandos:

```text
move_input
attack_requested
interact_requested
craft_requested
place_structure_requested
equip_requested
```

O servidor valida e executa ações. O cliente não envia “minha madeira agora é 50”.

### 30.3 Procedural e rede

Clientes podem gerar terreno visualmente usando seed e versão, enquanto o servidor mantém autoridade de alterações persistentes:

- recursos removidos;
- estruturas;
- containers;
- fauna relevante;
- POIs coletados.

### 30.4 Reconexão e compatibilidade

- permitir janela de reconexão;
- versionar schema e geração;
- nunca renomear/remover campos sincronizados sem migração;
- testar mensagens e payloads inválidos;
- usar Redis/presence apenas quando houver múltiplos processos.

## 31. Como um agente deve implementar uma nova feature

Antes de editar:

1. leia este manual e as regras locais;
2. encontre o dono atual do estado;
3. localize testes do domínio;
4. escreva o comportamento esperado em frases;
5. separe regra pura, integração e visual;
6. identifique impacto em teclado, mouse e DualSense;
7. identifique impacto em save e versões;
8. identifique custo por frame/chunk/entidade.

Durante a implementação:

1. comece pela regra headless;
2. adicione testes;
3. integre no engine por função nomeada;
4. exponha uma ação pequena para a UI;
5. implemente visual e feedback;
6. preserve determinismo;
7. evite alocação em hot paths;
8. descarte runtime removido.

Antes de entregar:

1. rode build;
2. rode lint;
3. rode testes;
4. confira `git diff --check`;
5. teste fluxo feliz e pelo menos uma falha;
6. confirme controle e teclado;
7. confirme save/load quando aplicável;
8. descreva qualquer limitação restante.

## 32. Checklist de revisão arquitetural

- [ ] A feature reforça um pilar do produto.
- [ ] Existe uma única fonte de verdade.
- [ ] UI não implementa regra de gameplay.
- [ ] Regra pura não importa Three, React, DOM ou storage.
- [ ] Randomness de gameplay é seeded.
- [ ] Tempo vem do game loop.
- [ ] O frame loop continua centralizado.
- [ ] Objetos removidos deixam de participar da simulação.
- [ ] Geometrias, materiais e colliders são descartados.
- [ ] Controle navega e executa todas as ações necessárias.
- [ ] External data é normalizado.
- [ ] Save continua retrocompatível ou foi versionado.
- [ ] Há testes para regressões caras.
- [ ] Build, lint e testes passam.

## 33. Próximos passos recomendados para Aurora Wilds

Ordem de maior impacto atual:

1. roupas visuais com proteção de frio/calor;
2. progressão pedra → cobre → ferro;
3. bancada de fabricação;
4. esquiva, escudo e feedback de combate;
5. loot físico e ecossistema entre animais;
6. dungeons modulares maiores;
7. áudio e VFX;
8. refatoração incremental do `engine.ts` em sistemas;
9. medição de desempenho e pooling;
10. multiplayer somente após contratos headless estarem estáveis.

## 34. Definição de “mesmo nível”

Uma reprodução não alcançou o nível do Aurora Wilds apenas porque possui terreno e um personagem. Ela deve demonstrar:

- mundo contínuo e determinístico;
- movimento agradável com corrida e rotação corretas;
- teclado e DualSense completos;
- coleta física com ferramentas;
- inventário/hotbar extensíveis;
- crafting e primeira noite balanceada;
- vegetação densa e reativa;
- construção modular com snap e suporte;
- combate com combo e animação coerente;
- fauna e eventos noturnos;
- exploração vertical, POIs e dungeon segura;
- minimapa coerente;
- save versionado;
- criador de personagem persistente;
- build, lint e testes automatizados.

Mais importante: esses sistemas precisam formar um ciclo em que explorar permite fabricar, fabricar permite sobreviver, sobreviver permite construir e construir permite explorar regiões mais perigosas.

## 35. Comandos locais

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

Requisito atual: Node.js `>=22.13.0`.

O projeto deve continuar executável localmente sem exigir publicação ou serviços externos.

## 36. Referências de origem

Este manual sintetiza:

- as regras de arquitetura genérica de jogos fornecidas ao projeto;
- as regras de arquitetura R3F, traduzidas para o uso atual de Three.js direto;
- a referência de Colyseus, utilizada apenas como direção futura de multiplayer;
- as implementações e testes existentes em `app/game` e `tests`;
- as regressões visuais, de controle e gameplay descobertas durante as iterações.

Em caso de conflito, a ordem de precedência recomendada é:

1. pedido atual do usuário;
2. regras locais do repositório;
3. comportamento coberto por testes;
4. este manual;
5. recomendações genéricas externas.

---

**Princípio final:** reproduzir o nível do Wilds não significa copiar cada arquivo. Significa preservar os contratos de experiência, determinismo, clareza visual, controle, persistência e testabilidade que fizeram o protótipo deixar de ser apenas uma cena 3D e se tornar um jogo de sobrevivência coerente.
