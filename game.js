(() => {
  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas.getContext('2d');
  const rules = window.HEX_LIFE_RULES;
  const state = {
    cols: 0,
    rows: 0,
    cells: new Set(),
    running: false,
    generation: 0,
    placement: 'random',
    speed: 2,
    side: 11,
    offsetX: 0,
    offsetY: 88,
    lastStep: 0,
    manualElapsed: 0,
    buttons: [],
  };

  const placements = [
    { id: 'blank', label: 'Blank' },
    { id: 'random', label: 'Random' },
    { id: 'cluster', label: 'Cluster' },
  ];
  const neighborOffsets = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const key = (q, r) => `${q},${r}`;
  const parse = (cellKey) => cellKey.split(',').map(Number);
  const inBounds = (q, r) => q >= 0 && r >= 0 && q < state.cols && r < state.rows;

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    state.side = Math.max(7, Math.min(10, Math.floor((width - 36) / 96)));
    const hexWidth = Math.sqrt(3) * state.side;
    state.rows = Math.max(8, Math.floor((height - state.offsetY - 18) / (state.side * 1.5)));
    // Every successive row is shifted half a hex-width, so account for that
    // before choosing the column count. This keeps the full board on screen.
    const usableWidth = width - 40 - Math.sqrt(3) * state.side;
    state.cols = Math.max(9, Math.floor(usableWidth / hexWidth - (state.rows - 1) / 2) + 1);
    const spanX = (state.cols - 1) * hexWidth + (state.rows - 1) * hexWidth / 2;
    state.offsetX = (width - spanX) / 2;
    seed(state.placement);
  }

  function center(q, r) {
    return {
      x: state.offsetX + Math.sqrt(3) * state.side * (q + r / 2),
      y: state.offsetY + state.side * 1.5 * r,
    };
  }

  function drawHex(x, y, fill, stroke = null) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const px = x + state.side * Math.cos(angle);
      const py = y + state.side * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function boardCellAt(x, y) {
    const approxR = Math.round((y - state.offsetY) / (state.side * 1.5));
    const approxQ = Math.round((x - state.offsetX) / (Math.sqrt(3) * state.side) - approxR / 2);
    let closest = null;
    let distance = Infinity;
    for (let r = approxR - 1; r <= approxR + 1; r++) {
      for (let q = approxQ - 1; q <= approxQ + 1; q++) {
        if (!inBounds(q, r)) continue;
        const point = center(q, r);
        const d = Math.hypot(x - point.x, y - point.y);
        if (d < distance) { distance = d; closest = [q, r]; }
      }
    }
    return distance < state.side ? closest : null;
  }

  function seed(which, append = false) {
    if (!append) {
      state.cells.clear();
      state.generation = 0;
      state.manualElapsed = 0;
    }
    const level = Math.random() / 3;
    if (which === 'random') {
      for (let r = 1; r < state.rows - 1; r++) {
        for (let q = 1; q < state.cols - 1; q++) {
          if (Math.random() < level) state.cells.add(key(q, r));
        }
      }
    }
    if (which === 'cluster') {
      let remaining = Math.min(40 + Math.floor(Math.random() * 121), state.cols * state.rows - state.cells.size);
      const count = Math.min(5, Math.floor(remaining / 8));
      if (!count) return;
      const clear = (q, r) => inBounds(q, r) && !state.cells.has(key(q, r)) && (append || neighborOffsets.every(([dq, dr]) => !state.cells.has(key(q + dq, r + dr))));
      for (let i = 0; i < count; i++) {
        const size = i === count - 1 ? remaining : 8 + Math.floor(Math.random() * (remaining - 8 * (count - i) + 1));
        remaining -= size;
        let q0, r0;
        do { q0 = Math.floor(Math.random() * state.cols); r0 = Math.floor(Math.random() * state.rows); } while (!clear(q0, r0));
        const cluster = new Set([key(q0, r0)]);
        while (cluster.size < size) {
          const [q, r] = parse([...cluster][Math.floor(Math.random() * cluster.size)]);
          const [dq, dr] = neighborOffsets[Math.floor(Math.random() * neighborOffsets.length)];
          if (clear(q + dq, r + dr)) cluster.add(key(q + dq, r + dr));
        }
        cluster.forEach((cellKey) => state.cells.add(cellKey));
      }
    }
  }

  function step() {
    const candidates = new Set(state.cells);
    state.cells.forEach((cellKey) => {
      const [q, r] = parse(cellKey);
      neighborOffsets.forEach(([dq, dr]) => {
        if (inBounds(q + dq, r + dr)) candidates.add(key(q + dq, r + dr));
      });
    });
    const next = new Set();
    candidates.forEach((cellKey) => {
      const [q, r] = parse(cellKey);
      const alive = neighborOffsets.map(([dq, dr]) => state.cells.has(key(q + dq, r + dr)));
      const neighbors = alive.filter(Boolean).length;
      const hasAdjacent = alive.some((isAlive, i) => isAlive && alive[(i + 1) % 6]);
      const hasOpen = alive.some((isAlive, i) => !isAlive && !alive[(i + 1) % 6]);
      if (state.cells.has(cellKey) ? rules.survive.includes(neighbors) : rules.birth.includes(neighbors) && hasAdjacent && hasOpen) next.add(cellKey);
    });
    state.cells = next;
    state.generation++;
  }

  function button(label, x, y, width, active, action) {
    state.buttons.push({ x, y, width, height: 31, action });
    ctx.fillStyle = active ? '#111' : '#fff';
    ctx.fillRect(x, y, width, 31);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, width - 1, 30);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = active ? '#fff' : '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + 16);
  }

  function render() {
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    state.buttons = [];
    ctx.fillStyle = '#111';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('PLACEMENT', 20, 31);
    let x = 112;
    placements.forEach((placement) => {
      button(placement.label, x, 16, 72, state.placement === placement.id, () => {
        state.placement = placement.id;
        if (state.running && placement.id !== 'blank') seed(placement.id, true);
        else { state.running = false; seed(placement.id); }
      });
      x += 79;
    });
    const right = width - 20;
    button('Reset', right - 236, 16, 68, false, () => { state.running = false; seed(state.placement); });
    button('Step', right - 160, 16, 68, false, () => { state.running = false; step(); });
    button(state.running ? 'Pause' : 'Run', right - 84, 16, 64, state.running, () => { state.running = !state.running; });
    [1, 2, 5, 20].forEach((speed, i) => button(`x${speed}`, right - 236 + i * 58, 50, 50, state.speed === speed, () => { state.speed = speed; }));
    ctx.textAlign = 'left';
    ctx.fillText(`GEN ${String(state.generation).padStart(3, '0')}`, 20, 66);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, 81.5); ctx.lineTo(right, 81.5); ctx.stroke();
    for (let r = 0; r < state.rows; r++) {
      for (let q = 0; q < state.cols; q++) {
        const c = center(q, r);
        if (state.cells.has(key(q, r))) drawHex(c.x, c.y, '#111');
      }
    }
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const p = pointerPosition(event);
    const hit = state.buttons.find((b) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height);
    if (hit) { hit.action(); render(); return; }
    const cell = boardCellAt(p.x, p.y);
    if (cell) {
      state.running = false;
      const cellKey = key(...cell);
      if (state.cells.has(cellKey)) state.cells.delete(cellKey); else state.cells.add(cellKey);
      render();
    }
  });

  function loop(time) {
    if (state.running && time - state.lastStep > 150 / state.speed) { step(); state.lastStep = time; }
    render();
    requestAnimationFrame(loop);
  }

  window.advanceTime = (ms) => {
    if (state.running) {
      state.manualElapsed += ms * state.speed;
      while (state.manualElapsed >= 150) {
        step();
        state.manualElapsed -= 150;
      }
    }
    render();
  };
  window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: 'axial hex grid: q increases right, r increases down-right',
    running: state.running,
    placement: state.placement,
    speed: state.speed,
    generation: state.generation,
    liveCells: state.cells.size,
    controls: ['Blank', 'Random', 'Cluster', 'Step', state.running ? 'Pause' : 'Run', 'Reset', 'x1', 'x2', 'x5', 'x20'],
  });

  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();
  requestAnimationFrame(loop);
})();
