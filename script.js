const gridSize = 10;
let currentPlayer = 1;

// Estructura de datos para los jugadores
const players = {
    1: { shots: 0, hits: 0, sunk: 0, sunkShips: [] },
    2: { shots: 0, hits: 0, sunk: 0, sunkShips: [] }
};

// Jugador 1 dispara en grid2, Jugador 2 dispara en grid1
function getTargetGrid(playerNum) {
    return playerNum === 1 ? 'grid2' : 'grid1';
}

// Modificar createShip para aceptar nombre
function createShip(size, shipList, nombre) {
  let placed = false;
  let attempts = 0;
  const maxAttempts = 200; // evita bucle infinito
  while (!placed && attempts < maxAttempts) {
    attempts++;
    const horizontal = Math.random() < 0.5;
    const maxRow = horizontal ? gridSize - 1 : gridSize - size;
    const maxCol = horizontal ? gridSize - size : gridSize - 1;
    const row = Math.floor(Math.random() * (maxRow + 1));
    const col = Math.floor(Math.random() * (maxCol + 1));
    const positions = [];

    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      positions.push([r, c]);
    }

    const overlap = positions.some(pos =>
      shipList.some(ship => ship.positions.some(p => p[0] === pos[0] && p[1] === pos[1]))
    );

    if (!overlap) {
      shipList.push({ positions, hits: [], nombre });
      placed = true;
    }
  }
  if (!placed) {
    console.warn(`No se pudo colocar un barco de tamaño ${size} tras ${maxAttempts} intentos`);
  }
}

function setupGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) {
        console.error(`No se encontró el grid ${gridId}`);
        return;
    }
    
    grid.innerHTML = '';
    
    // Identificar a qué jugador pertenece este grid
    const gridOwner = gridId === 'grid1' ? 1 : 2;
    // Identificar qué jugador puede atacar este grid (el opuesto al dueño)
    const canBeAttackedBy = gridId === 'grid1' ? 2 : 1;
    
    console.log(`Configurando ${gridId} - Pertenece a Jugador ${gridOwner}, puede ser atacado por Jugador ${canBeAttackedBy}`);
    
    // Crear celdas del grid
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.dataset.owner = gridOwner;
            
            // Añadir evento de clic directamente
            cell.addEventListener('click', function() {
                console.log(`Click en ${gridId} [${r},${c}] - Turno actual: ${currentPlayer}`);
                
                // Verificar si el jugador está disparando a su propio tablero
                if (gridOwner === currentPlayer) {
                    showToast(`Jugador ${currentPlayer}: ¡No puedes disparar a tu propio tablero!`);
                    return;
                }
                
                // Siempre permitir disparos al tablero contrario
                
                // Si la celda ya fue atacada, ignorar
                if (this.classList.contains('hit') || 
                    this.classList.contains('miss') || 
                    this.classList.contains('sunk')) {
                    showToast('Esta celda ya fue atacada');
                    return;
                }
                
                // Obtener la posición del disparo
                const row = parseInt(this.dataset.row);
                const col = parseInt(this.dataset.col);
                
                // Buscar si hay un barco en esta posición
                const ownerShips = players[gridOwner].ships || [];
                const hitShip = ownerShips.find(ship => 
                    ship.positions.some(([r, c]) => r === row && c === col)
                );

                const hit = hitShip !== undefined;
                this.classList.add(hit ? 'hit' : 'miss');

                // Actualizar estadísticas
                players[currentPlayer].shots++;
                
                if (hit) {
                    players[currentPlayer].hits++;
                    playSound('sound-hit');
                    
                    // Encontrar qué posición del barco fue golpeada
                    const hitPosition = hitShip.positions.findIndex(([r, c]) => r === row && c === col);
                    hitShip.hits = hitShip.hits || [];
                    hitShip.hits.push(hitPosition);
                    
                    // Verificar si el barco está hundido (todas las posiciones golpeadas)
                    if (hitShip.hits.length === hitShip.positions.length) {
                        players[currentPlayer].sunk++;
                        hitShip.positions.forEach(([r, c]) => {
                            const cell = document.querySelector(`#${gridId} .cell[data-row="${r}"][data-col="${c}"]`);
                            cell.classList.remove('hit');
                            cell.classList.add('sunk');
                        });
                        
                        // Actualizar la lista de barcos hundidos
                        updateSunkShips(gridOwner, hitShip.nombre);
                        
                        showToast(`¡Hundiste un ${hitShip.nombre}! 🚢`);
                        playSound('sound-sunk');
                    } else {
                        showToast('¡Impacto! 🎯');
                    }
                } else {
                    playSound('sound-miss');
                    showToast('¡Agua! 💦');
                }
                
                // Actualizar contadores
                updateStats(currentPlayer);
                // Sincronizar estado completo
                sendFullGameState();
                // Cambiar turno automáticamente
                setTimeout(() => {
                  switchTurn();
                  sendFullGameState();
                }, 800);
                // sendFullGameState();
            });
            
            grid.appendChild(cell);
        }
    }
}

function updateSunkShips(playerNum, shipName) {
    if (!players[playerNum].sunkShips) {
        players[playerNum].sunkShips = [];
    }
    players[playerNum].sunkShips.push(shipName);
    
    // Actualizar la lista visual de barcos
    const shipsList = document.getElementById(`ships-list-${playerNum === 1 ? 2 : 1}`);
    const ships = shipsList.getElementsByClassName('ship-item');
    
    for (let ship of ships) {
        const shipText = ship.textContent;
        if (shipText.includes(shipName)) {
            ship.style.textDecoration = 'line-through';
            ship.style.opacity = '0.6';
        }
    }
}

function handleShot(cell, ownerNum) {
  console.log(`Click en celda del jugador ${ownerNum}, turno actual: ${currentPlayer}`);
  
  // Solo puedes disparar al grid del oponente
  if (currentPlayer === ownerNum) {
    showToast('¡No puedes disparar a tu propio tablero!');
    return;
  }

  // Verificar si es el grid correcto para atacar
  const attackGrid = players[currentPlayer].attackGrid;
  const cellGrid = cell.closest('.grid').id;
  if (attackGrid !== cellGrid) {
    showToast(`Jugador ${currentPlayer} debe atacar el tablero ${attackGrid}`);
    return;
  }

  // si el área está en blackout, ignorar clicks
  const targetArea = document.getElementById(`player${ownerNum}-area`);
  if (targetArea && targetArea.classList.contains('blackout')) {
    showToast('No puedes disparar cuando el tablero está oscurecido');
    return;
  }

  const r = parseInt(cell.dataset.row, 10);
  const c = parseInt(cell.dataset.col, 10);
  if (Number.isNaN(r) || Number.isNaN(c)) return;
  if (cell.classList.contains('hit') || cell.classList.contains('miss') || cell.classList.contains('sunk')) return;

  const shooter = players[currentPlayer];
  const target = players[targetPlayerNum];
  shooter.shots++;
  const shotsEl = document.getElementById(`p${currentPlayer}-shots`);
  if (shotsEl) shotsEl.textContent = shooter.shots;

  // si hay conexión WS notificar el disparo
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'shot', row: r, col: c, shooter: currentPlayer, target: targetPlayerNum }));
    }
  } catch (e) {
    console.warn('No se pudo enviar disparo por WS', e);
  }

  let hitShip = null;
  for (let ship of (target.ships || [])) {
    for (let pos of ship.positions) {
      if (pos[0] === r && pos[1] === c) {
        hitShip = ship;
        ship.hits.push(`${r},${c}`);
        break;
      }
    }
    if (hitShip) break;
  }

  if (hitShip) {
    cell.classList.add('hit');
    shooter.hits++;
    const hitsEl = document.getElementById(`p${currentPlayer}-hits`);
    if (hitsEl) hitsEl.textContent = shooter.hits;

    if ((hitShip.hits || []).length === (hitShip.positions || []).length) {
      shooter.sunk++;
      const sunkEl = document.getElementById(`p${currentPlayer}-sunk`);
      if (sunkEl) sunkEl.textContent = shooter.sunk;
      for (let pos of hitShip.positions) {
        const selector = `.cell[data-row="${pos[0]}"][data-col="${pos[1]}"]`;
        const el = document.querySelector(`#grid${targetPlayerNum} ${selector}`);
        if (el) {
          el.classList.remove('hit');
          el.classList.add('sunk');
        }
      }
    }
  } else {
    cell.classList.add('miss');
  }
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play();
    }
}

// Reproducir una lista de elementos <audio> secuencialmente
function playAllSequentially(audioIds) {
  if (!audioIds || audioIds.length === 0) return;
  let i = 0;
  const playNext = () => {
    if (i >= audioIds.length) return;
    const a = document.getElementById(audioIds[i]);
    if (!a) { i++; playNext(); return; }
    a.currentTime = 0;
    a.play();
    a.onended = () => { i++; playNext(); };
  };
  playNext();
}

// Merge (concatenate) audio files and offer a WAV download
async function mergeAndDownloadSounds(audioSrcs) {
  if (!audioSrcs || audioSrcs.length === 0) {
    alert('No hay sonidos para unir');
    return;
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffers = [];
  try {
    for (const src of audioSrcs) {
      const res = await fetch(src);
      const ab = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
      buffers.push(decoded);
    }

    // Calcular longitud total en frames
    const sampleRate = ctx.sampleRate;
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

    // Crear buffer de salida (mono)
    const outBuffer = ctx.createBuffer(1, totalLength, sampleRate);
    let offset = 0;
    for (const b of buffers) {
      // Mezclar canales a mono (si tiene más de uno)
      const channelData = b.numberOfChannels > 1 ? b.getChannelData(0) : b.getChannelData(0);
      outBuffer.getChannelData(0).set(channelData, offset);
      offset += b.length;
    }

    // Convertir a WAV (PCM16)
    const wavBlob = bufferToWavBlob(outBuffer);
    const url = URL.createObjectURL(wavBlob);

    // Crear link de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged_sounds.wav';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error('Error al unir sonidos', err);
    alert('Error al unir sonidos: ' + err.message);
  }
}

// Convierte AudioBuffer (mono) a WAV Blob (PCM16)
function bufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  // Interleave
  const length = audioBuffer.length * numChannels;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */ writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  view.setUint16(32, numChannels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);

  // write interleaved samples
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      // clamp
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      // scale to 16-bit signed int
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Al inicializar la página, encontrar los audios existentes y enlazar botones
window.addEventListener('DOMContentLoaded', () => {
  // Recopilar todos los elementos audio en Sounds/
  const audios = Array.from(document.querySelectorAll('audio'))
    .filter(a => a.src && a.src.includes('Sounds'));
  const audioIds = audios.map((a, idx) => a.id || ('sound_auto_' + idx));
  const audioSrcs = audios.map(a => a.getAttribute('src'));

  // Mostrar lista
  const listEl = document.getElementById('sounds-list');
  if (listEl) {
    if (audioSrcs.length === 0) listEl.textContent = 'No se encontraron sonidos en /Sounds';
    else listEl.innerHTML = '<strong>Encontrados:</strong> ' + audioSrcs.join(', ');
  }

  // Botones
  const btnAll = document.getElementById('btn-play-all');
  const btnMerge = document.getElementById('btn-merge-download');
  const btnTest = document.getElementById('btn-test-turn');

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      // reproducir los elementos audio en el orden que aparecen
      playAllSequentially(audios.map(a => a.id));
    });
  }

  if (btnMerge) {
    btnMerge.addEventListener('click', async () => {
      btnMerge.disabled = true;
      btnMerge.textContent = 'Procesando...';
      await mergeAndDownloadSounds(audioSrcs);
      btnMerge.disabled = false;
      btnMerge.textContent = 'Unir y descargar WAV';
    });
  }

  if (btnTest) {
    btnTest.addEventListener('click', () => {
      const a = document.getElementById('sound-turn');
      if (!a) return alert('No se encontró el audio de turno (sound-turn)');
      a.currentTime = 0;
      // reproducir y atrapar posibles errores (autoplay policy)
      a.play().catch(err => {
        console.warn('Reproducción bloqueada o fallida:', err);
        alert('No se pudo reproducir el sonido. Revisa la consola para más detalles.');
      });
    });
  }

  colocarNaviosAuto(1);
  colocarNaviosAuto(2);
  // Mostrar lista de navíos
  const shipsHtml = NAVIOS.map(n => 
    `<li class="ship-item" data-name="${n.nombre}">
       ${n.nombre} (Tamaño: ${n.tam}) - ${n.cantidad} unidad${n.cantidad !== 1 ? 'es' : ''}
     </li>`
  ).join('');
  const ul1 = document.getElementById('ships-list-1');
  const ul2 = document.getElementById('ships-list-2');
  if (ul1) ul1.innerHTML = `<ul>${shipsHtml}</ul>`;
  if (ul2) ul2.innerHTML = `<ul>${shipsHtml}</ul>`;
});

// === INICIO: CONEXIÓN WEBSOCKET ===
let ws;
function connectWS() {
  try {
    ws = new window.WebSocket('ws://localhost:3000');
    ws.onopen = () => console.log('Conectado a WebSocket');
    ws.onclose = () => { console.warn('Desconectado de WebSocket'); setTimeout(connectWS, 2000); };
    ws.onerror = (e) => console.warn('Error WebSocket', e);
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'shot') {
          // Simular disparo recibido
          handleRemoteShot(data);
        } else if (data.type === 'switch') {
          // Cambiar turno remoto
          if (currentPlayer !== data.currentPlayer) switchTurn(true);
        } else if (data.type === 'fullstate') {
          // Sincronizar estado completo del juego
          setFullGameState(data.state);
        }
      } catch (e) { console.warn('WS mensaje inválido', e); }
    };
  } catch (e) { console.warn('No se pudo conectar a WebSocket', e); }
}
connectWS();
// === FIN: CONEXIÓN WEBSOCKET ===

// Manejar disparo recibido por red
function handleRemoteShot(data) {
  // Buscar la celda objetivo y simular el disparo
  const gridId = data.target === 1 ? 'grid1' : 'grid2';
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const cell = grid.querySelector(`.cell[data-row="${data.row}"][data-col="${data.col}"]`);
  if (!cell) return;
  // Simular click si no fue ya atacada
  if (!cell.classList.contains('hit') && !cell.classList.contains('miss') && !cell.classList.contains('sunk')) {
    cell.click();
  }
}

function switchTurn(remote = false) {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    playSound('sound-turn');
    console.log(`Turno del Jugador ${currentPlayer}`);

    const p1Area = document.getElementById('player1-area');
    const p2Area = document.getElementById('player2-area');

    if (p1Area && p2Area) {
        if (currentPlayer === 1) {
            p1Area.classList.remove('blackout');
            p2Area.classList.add('blackout');
        } else {
            p2Area.classList.remove('blackout');
            p1Area.classList.add('blackout');
        }
    }

    // Actualizar indicador de turno
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
        turnIndicator.textContent = `Turno: Jugador ${currentPlayer}`;
    }

    showToast(`¡Turno del Jugador ${currentPlayer}!`);

    // enviar cambio de turno a servidor si está conectado
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'switch', currentPlayer }));
      }
    } catch (e) {
      console.warn('No se pudo notificar cambio de turno por WS', e);
    }

    // Enviar estado completo tras cada cambio de turno
    sendFullGameState();
}

// === SINCRONIZACIÓN COMPLETA DE TABLEROS ===
function getFullGameState() {
  // Serializa el estado de los tableros y estadísticas
  const grids = {};
  [1,2].forEach(num => {
    const grid = document.getElementById('grid'+num);
    if (!grid) return;
    grids[num] = Array.from(grid.querySelectorAll('.cell')).map(cell => ({
      row: +cell.dataset.row,
      col: +cell.dataset.col,
      classes: Array.from(cell.classList)
    }));
  });
  return {
    currentPlayer,
    players,
    grids
  };
}

function setFullGameState(state) {
  if (!state || !state.grids) return;
  currentPlayer = state.currentPlayer;
  // Actualizar stats
  if (state.players) {
    Object.assign(players[1], state.players[1]);
    Object.assign(players[2], state.players[2]);
    updateStats(1); updateStats(2);
  }
  // Actualizar celdas
  [1,2].forEach(num => {
    const grid = document.getElementById('grid'+num);
    if (!grid) return;
    state.grids[num].forEach(cellData => {
      const cell = grid.querySelector(`.cell[data-row="${cellData.row}"][data-col="${cellData.col}"]`);
      if (cell) {
        cell.className = 'cell';
        cellData.classes.forEach(cls => { if (cls !== 'cell') cell.classList.add(cls); });
      }
    });
  });
  // Actualizar turno y blackout
  const p1Area = document.getElementById('player1-area');
  const p2Area = document.getElementById('player2-area');
  if (p1Area && p2Area) {
    if (currentPlayer === 1) {
      p1Area.classList.remove('blackout');
      p2Area.classList.add('blackout');
    } else {
      p2Area.classList.remove('blackout');
      p1Area.classList.add('blackout');
    }
  }
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) turnIndicator.textContent = `Turno: Jugador ${currentPlayer}`;
}

// Enviar estado completo tras cada disparo y cambio de turno
function sendFullGameState() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'fullstate', state: getFullGameState() }));
  }
}

// Modificar eventos relevantes para enviar el estado completo:
// Después de cada disparo y cambio de turno, llamar a sendFullGameState()

function updateStats(playerNum) {
    const stats = players[playerNum];
    document.getElementById(`p${playerNum}-shots`).textContent = stats.shots;
    document.getElementById(`p${playerNum}-hits`).textContent = stats.hits;
    document.getElementById(`p${playerNum}-sunk`).textContent = stats.sunk;
}

function startGame() {
    console.log('Iniciando nuevo juego...');
    
    // Reiniciar estadísticas
    players[1] = { shots: 0, hits: 0, sunk: 0 };
    players[2] = { shots: 0, hits: 0, sunk: 0 };
    
    // Reiniciar contadores en el DOM
    updateStats(1);
    updateStats(2);
    
    // Reiniciar estado de los jugadores
    players[1].ships = [];
    players[2].ships = [];
    players[1].sunkShips = [];
    players[2].sunkShips = [];
    
    // Crear barcos para cada jugador
    const ships = [
        { size: 5, nombre: 'Portaaviones' },
        { size: 4, nombre: 'Acorazado' },
        { size: 3, nombre: 'Crucero' },
        { size: 3, nombre: 'Submarino' },
        { size: 2, nombre: 'Destructor' }
    ];
    
    // Colocar barcos para ambos jugadores
    ships.forEach(ship => {
        createShip(ship.size, players[1].ships, ship.nombre);
        createShip(ship.size, players[2].ships, ship.nombre);
    });
    
    // Configurar tableros
    setupGrid('grid1');
    setupGrid('grid2');
    
    // Iniciar con Jugador 1
    currentPlayer = 1;
    switchTurn();
    
    showToast('¡Juego iniciado! Turno del Jugador 1');
}

startGame();

// ---- UX extras: toast y atajo ----
function showToast(msg, ms = 1800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._hideTimeout);
  t._hideTimeout = setTimeout(() => t.classList.remove('show'), ms);
}

// Variables para el cursor del teclado
let selectedRow = 0;
let selectedCol = 0;
let lastHighlighted = null;

// Resaltar la celda seleccionada
function highlightSelectedCell() {
    // Quitar resaltado anterior
    if (lastHighlighted) {
        lastHighlighted.style.border = '1px solid #0097a7';
    }

    // Obtener el grid donde el jugador actual puede disparar
    const targetGrid = getTargetGrid(currentPlayer);
    const grid = document.getElementById(targetGrid);
    if (!grid) return;

    // Encontrar la celda en las coordenadas actuales
    const cell = grid.querySelector(`[data-row="${selectedRow}"][data-col="${selectedCol}"]`);
    if (cell) {
        cell.style.border = '3px solid yellow';
        lastHighlighted = cell;
    }
}

// Controles de teclado
window.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            selectedRow = Math.max(0, selectedRow - 1);
            break;
        case 'KeyS':
        case 'ArrowDown':
            selectedRow = Math.min(gridSize - 1, selectedRow + 1);
            break;
        case 'KeyA':
        case 'ArrowLeft':
            selectedCol = Math.max(0, selectedCol - 1);
            break;
        case 'KeyD':
        case 'ArrowRight':
            selectedCol = Math.min(gridSize - 1, selectedCol + 1);
            break;
        case 'Space':
            // Simular clic en la celda seleccionada
            const targetGrid = getTargetGrid(currentPlayer);
            const grid = document.getElementById(targetGrid);
            if (grid) {
                const cell = grid.querySelector(`[data-row="${selectedRow}"][data-col="${selectedCol}"]`);
                if (cell) {
                    cell.click();
                }
            }
            return;
    }
    
    highlightSelectedCell();
});

// Iniciar el juego cuando cargue la página
startGame();

// === DEFINICIÓN DE NAVÍOS ===
const NAVIOS = [
  { nombre: 'Portaaviones', tam: 5, cantidad: 1, color: '#FF5733' },
  { nombre: 'Acorazado', tam: 4, cantidad: 1, color: '#33FF57' },
  { nombre: 'Submarino', tam: 3, cantidad: 1, color: '#3357FF' },
  { nombre: 'Destructor', tam: 3, cantidad: 1, color: '#FF33E9' },
  { nombre: 'Fragata', tam: 2, cantidad: 1, color: '#33FFF9' },
  { nombre: 'Lancha', tam: 1, cantidad: 1, color: '#FFD933' }
];

function colocarNaviosAuto(jugadorNum) {
  if (!players[jugadorNum]) players[jugadorNum] = { shots: 0, hits: 0, sunk: 0 };
  players[jugadorNum].ships = [];
  NAVIOS.forEach(barco => {
    for (let i = 0; i < barco.cantidad; i++) {
      createShip(barco.tam, players[jugadorNum].ships, barco.nombre);
    }
  });
}