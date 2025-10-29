const gridSize = 10;
let currentPlayer = 1;

const players = {
  1: { shots: 0, hits: 0, sunk: 0, sunkShips: [], ships: [] },
  2: { shots: 0, hits: 0, sunk: 0, sunkShips: [], ships: [] }
};

const NAVIOS = [
  { nombre: 'Portaaviones', tam: 5, cantidad: 1 },
  { nombre: 'Acorazado', tam: 4, cantidad: 1 },
  { nombre: 'Submarino', tam: 3, cantidad: 1 },
  { nombre: 'Destructor', tam: 3, cantidad: 1 },
  { nombre: 'Fragata', tam: 2, cantidad: 1 },
  { nombre: 'Lancha', tam: 1, cantidad: 1 }
];

// === INSTRUCTIVO ===
function showInstructivo() {
  const overlay = document.createElement('div');
  overlay.id = 'instructivo-overlay';
  overlay.innerHTML = `
    <h2>Bienvenido a Batalla Naval</h2>
    <p>Juego para 2 jugadores. Cada jugador disparará turnos intentando hundir los barcos del oponente.</p>
    <p>Controles: Click en una celda para disparar.</p>
    <button id="btn-comenzar">Comenzar Juego</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btn-comenzar').addEventListener('click', () => {
    overlay.remove();
    startGame();
  });
}

// === FUNCIONES ===
function createShip(size, shipList, nombre) {
  let placed = false, attempts = 0;
  while (!placed && attempts < 200) {
    attempts++;
    const horizontal = Math.random() < 0.5;
    const maxRow = horizontal ? gridSize-1 : gridSize-size;
    const maxCol = horizontal ? gridSize-size : gridSize-1;
    const row = Math.floor(Math.random()*(maxRow+1));
    const col = Math.floor(Math.random()*(maxCol+1));
    const positions = [];
    for (let i=0;i<size;i++) {
      const r = horizontal ? row : row+i;
      const c = horizontal ? col+i : col;
      positions.push([r,c]);
    }
    const overlap = positions.some(pos => 
      shipList.some(ship => ship.positions.some(p => p[0]==pos[0] && p[1]==pos[1]))
    );
    if (!overlap) { shipList.push({positions, hits:[], nombre}); placed=true; }
  }
}

function setupGrid(gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  const gridOwner = gridId==='grid1'?1:2;
  for (let r=0;r<gridSize;r++) {
    for (let c=0;c<gridSize;c++) {
      const cell = document.createElement('div');
      cell.className='cell';
      cell.dataset.row=r;
      cell.dataset.col=c;
      cell.dataset.owner=gridOwner;
      cell.addEventListener('click',()=>handleShot(cell,gridOwner));
      grid.appendChild(cell);
    }
  }
}

function handleShot(cell, ownerNum) {
  if (currentPlayer===ownerNum) { showToast('¡No puedes disparar a tu propio tablero!'); return; }
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const targetShips = players[ownerNum].ships;
  if (cell.classList.contains('hit') || cell.classList.contains('miss') || cell.classList.contains('sunk')) return;

  players[currentPlayer].shots++;

  let hitShip = targetShips.find(ship => ship.positions.some(p=>p[0]===row && p[1]===col));

  if (hitShip) {
    cell.classList.add('hit');
    players[currentPlayer].hits++;
    const posIndex = hitShip.positions.findIndex(p=>p[0]===row && p[1]===col);
    hitShip.hits.push(posIndex);

    if (hitShip.hits.length === hitShip.positions.length) {
      hitShip.positions.forEach(([r,c])=>{
        const targetCell = document.querySelector(`.cell[data-owner='${ownerNum}'][data-row='${r}'][data-col='${c}']`);
        targetCell.classList.remove('hit'); targetCell.classList.add('sunk');
      });
      players[currentPlayer].sunk++;
      players[currentPlayer].sunkShips.push(hitShip.nombre);
      showToast(`¡Hundiste el ${hitShip.nombre}!`);
    } else { showToast('¡Tocado!'); }
  } else {
    cell.classList.add('miss');
    showToast('Agua...');
  }

  updateStats();
  currentPlayer = currentPlayer===1?2:1;
  document.getElementById('turno').textContent = `Jugador ${currentPlayer}`;
}

function updateStats() {
  document.getElementById('stats1').textContent =
    `Disparos: ${players[1].shots} | Aciertos: ${players[1].hits} | Hundidos: ${players[1].sunk}`;
  document.getElementById('stats2').textContent =
    `Disparos: ${players[2].shots} | Aciertos: ${players[2].hits} | Hundidos: ${players[2].sunk}`;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className='toast'; toast.textContent=message;
  document.body.appendChild(toast);
  setTimeout(()=>toast.classList.add('show'),10);
  setTimeout(()=>{toast.classList.remove('show'); setTimeout(()=>toast.remove(),300);},2000);
}

function startGame() {
  setupGrid('grid1'); setupGrid('grid2');
  players[1].ships=[]; players[2].ships=[];
  NAVIOS.forEach(ship=>{
    for(let i=0;i<ship.cantidad;i++){
      createShip(ship.tam,players[1].ships,ship.nombre);
      createShip(ship.tam,players[2].ships,ship.nombre);
    }
  });
  currentPlayer=1; updateStats();
  document.getElementById('turno').textContent='Jugador 1';
  showToast('Juego iniciado. Turno Jugador 1');
}

// === INICIALIZAR ===
showInstructivo();
