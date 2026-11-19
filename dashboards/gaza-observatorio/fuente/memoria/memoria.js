/* Cada punto corresponde a una fila nominal. Ningún muestreo ni edad inferida.
   Porte de la vista de referencia al código fuente del observatorio: sin creación
   dinámica del panel ni del botón (la sección y la pestaña son estáticas), y con la
   línea de procedencia y el aviso de lista incompleta dentro de la propia vista. */
(() => {
  const people = __PERSONAS__.map((p, i) => ({ name: p[0], english: p[1], age: p[2], key: i }))
    .sort((a, b) => a.age - b.age || a.name.localeCompare(b.name, 'ar'));
  const e = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('es-MX');
  const safe = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const panel = e('#memoria');
  let filtered = [], selected = -1, page = 0, cols = 1, step = 18, width = 600, frame = 0;
  let zoom = 1;
  const ZOOM_MAX = 12;
  let encuadre = { n: -1, w: -1, h: -1, cols: 0, step: 0 };

  const viewport = e('#memViewport'), canvas = e('#memCanvas'), ctx = canvas.getContext('2d');

  const normalize = (s) => s.normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLocaleLowerCase().trim();
  people.forEach((p) => { p.search = normalize(p.name + ' ' + p.english); });

  // Rellenos sólidos, nunca opacidad: un punto claro sigue distinguiéndose del fondo.
  // El tono recorre el rango de edad de la selección (0–17, 18–110 o 0–110), con
  // una curva suave para que los más jóvenes no se agolpen en un extremo de la rampa.
  let rangoEdad = { min: 0, max: 17 };
  function color(age) {
    const span = rangoEdad.max - rangoEdad.min;
    const t = span > 0 ? Math.pow(Math.min(1, Math.max(0, (age - rangoEdad.min) / span)), 0.7) : 0.5;
    return `rgb(${Math.round(58 + 134 * t)},${Math.round(54 + 136 * t)},${Math.round(236 - 26 * t)})`;
  }

  function pintarEscala() {
    const min = e('#memScaleMin');
    const max = e('#memScaleMax');
    const texto = e('#memScale');
    if (!min || !max || !texto) return;
    min.textContent = fmt(rangoEdad.min);
    max.textContent = fmt(rangoEdad.max);
    texto.textContent = rangoEdad.max >= 110 && rangoEdad.min === 0
      ? 'Escala del tono: 0–110 años · edad declarada'
      : `Escala del tono: ${rangoEdad.min}–${rangoEdad.max} años (según la selección) · edad declarada`;
  }

  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }

  function estadoTexto() {
    const min = Number(e('#memMin').value), max = Number(e('#memMax').value);
    return min > max
      ? 'La edad mínima debe ser menor o igual a la máxima.'
      : `${fmt(filtered.length)} de ${fmt(people.length)} registros nominales · sin muestreo · ${cols} columnas × ${Math.ceil(Math.max(1, filtered.length) / cols)} filas`;
  }

  /* Columnas y paso que hacen caber los N puntos en el área disponible. Se busca
     el número de columnas que maximiza el paso; se recalcula solo cuando cambian
     el número de puntos o el tamaño del marco. */
  function calcularEncuadre(n, ancho, alto) {
    const W = Math.max(80, ancho - 24);
    const H = Math.max(80, alto - 24);
    if (encuadre.n === n && encuadre.w === Math.round(W) && encuadre.h === Math.round(H)) return encuadre;
    const estimado = Math.max(1, Math.round(Math.sqrt(n * (W / H))));
    let mejor = { cols: 1, step: 0 };
    const desde = Math.max(1, estimado - 90), hasta = Math.min(Math.max(n, 1), estimado + 90);
    for (let c = desde; c <= hasta; c++) {
      const filas = Math.ceil(n / c);
      const paso = Math.min(W / c, H / filas);
      if (paso > mejor.step) mejor = { cols: c, step: paso };
    }
    if (!mejor.step) mejor = { cols: Math.max(1, Math.min(n, estimado)), step: Math.min(W / Math.max(1, Math.min(n, estimado)), H / Math.ceil(n / Math.max(1, Math.min(n, estimado)))) };
    encuadre = { n: n, w: Math.round(W), h: Math.round(H), cols: mejor.cols, step: mejor.step };
    return encuadre;
  }

  function pintarZoom() {
    e('#memZoomLevel').textContent = Math.round(zoom * 100) + ' %';
    e('#memZoomOut').disabled = zoom <= 1;
    e('#memZoomIn').disabled = zoom >= ZOOM_MAX;
    canvas.dataset.memZoom = String(zoom);
  }

  const GROSOR = 0.22;
  function draw() {
    if (panel.hidden) return;
    width = viewport.clientWidth;
    const n = Math.max(1, filtered.length);
    const marco = calcularEncuadre(n, width, viewport.clientHeight);
    cols = marco.cols;
    step = marco.step * zoom;
    canvas.dataset.memCols = String(cols);
    canvas.dataset.memStep = step.toFixed(2);
    const rows = Math.ceil(filtered.length / cols);
    const height = Math.max(viewport.clientHeight, rows * step + 24);
    e('#memSpace').style.height = height + 'px';
    const h = viewport.clientHeight, dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = h + 'px';
    canvas.style.top = viewport.scrollTop + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, h);
    const start = Math.max(0, Math.floor((viewport.scrollTop - 12) / step));
    const end = Math.min(rows, Math.ceil((viewport.scrollTop + h) / step));
    for (let row = start; row < end; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (i >= filtered.length) break;
        const p = filtered[i];
        const x = 12 + step / 2 + col * step;
        const y = 12 + step / 2 + row * step - viewport.scrollTop;
        ctx.fillStyle = color(p.age);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.9, step * GROSOR), 0, Math.PI * 2);
        ctx.fill();
        if (i === selected) {
          ctx.strokeStyle = '#293447';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.6, step * 0.36), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    e('#memStatus').textContent = estadoTexto();
    if (!filtered.length) {
      ctx.fillStyle = '#69768e';
      ctx.font = '15px system-ui';
      ctx.fillText('No hay personas que coincidan con estos filtros.', 18, 34);
    }
  }

  function locate() {
    if (selected < 0) return;
    const y = 12 + Math.floor(selected / cols) * step;
    if (y < viewport.scrollTop || y + step > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = Math.max(0, y - viewport.clientHeight / 2);
    }
    schedule();
  }

  function detail() {
    const p = filtered[selected];
    e('#memPerson').innerHTML = p
      ? `<p class="memName" lang="ar" dir="rtl">${safe(p.name)}</p>`
        + `<h3>${safe(p.english || 'Sin transliteración disponible')}</h3>`
        + `<div class="memAge"><strong>${p.age === 0 ? 'Menos de 1' : p.age}</strong>`
        + `<span>${p.age <= 1 ? 'año' : 'años'} · edad declarada</span></div>`
        + `<p>${p.age < 18 ? 'Niño, niña o adolescente' : 'Persona adulta'} · registro ${fmt(selected + 1)} de ${fmt(filtered.length)} en esta selección.</p>`
        + '<p class="muted">Procedencia: lista nominal de Tech for Palestine (listas del Ministerio de Salud de Gaza), corte 7 de mayo de 2026.</p>'
        + '<p class="muted">Fecha de fallecimiento individual: no disponible en esta fuente.</p>'
      : '<p>No hay personas que coincidan con la búsqueda.</p>';
    e('#memPrev').disabled = selected <= 0;
    e('#memNext').disabled = selected < 0 || selected >= filtered.length - 1;
    e('#memLocate').disabled = selected < 0;
  }

  function choose(i, scroll = true) {
    selected = Math.max(0, Math.min(filtered.length - 1, i));
    if (!filtered.length) selected = -1;
    detail();
    if (scroll) locate(); else schedule();
  }

  function table() {
    const total = Math.ceil(filtered.length / 25);
    page = Math.min(page, Math.max(0, total - 1));
    e('#memRows').innerHTML = filtered.slice(page * 25, page * 25 + 25).map((p, j) => ''
      + '<tr>'
      + `<td lang="ar" dir="rtl">${safe(p.name)}</td>`
      + `<td>${safe(p.english)}</td>`
      + `<td>${p.age === 0 ? 'Menos de 1 año' : p.age + ' años'}</td>`
      + `<td><button data-mem-index="${page * 25 + j}">Seleccionar</button></td>`
      + '</tr>').join('');
    e('#memPage').textContent = total ? `Página ${page + 1} de ${fmt(total)} · 25 nombres por página` : 'Sin resultados';
    e('#memPagePrev').disabled = page <= 0;
    e('#memPageNext').disabled = page >= total - 1;
    e('#memRows').querySelectorAll('button').forEach((b) => { b.onclick = () => choose(+b.dataset.memIndex); });
  }

  function filter() {
    const old = filtered[selected]?.key;
    const q = normalize(e('#memSearch').value);
    const u = e('#memUniverse').value;
    const min = Number(e('#memMin').value);
    const max = Number(e('#memMax').value);
    filtered = people.filter((p) => (u === 'all' || (u === 'children' ? p.age < 18 : p.age >= 18))
      && p.age >= min && p.age <= max && p.search.includes(q));
    rangoEdad = filtered.length
      ? { min: Math.min(...filtered.map((p) => p.age)), max: Math.max(...filtered.map((p) => p.age)) }
      : { min: 0, max: 110 };
    pintarEscala();
    selected = filtered.findIndex((p) => p.key === old);
    if (selected < 0 && filtered.length) selected = 0;
    page = 0;
    viewport.scrollTop = 0;
    e('#memCount').textContent = fmt(filtered.length);
    e('#memScope').textContent = u === 'children' ? 'niños y adolescentes en la selección'
      : u === 'adults' ? 'adultos en la selección' : 'personas en la selección';
    e('#memStatus').textContent = estadoTexto();
    detail();
    table();
    schedule();
  }

  e('#memUniverse').onchange = () => {
    const u = e('#memUniverse').value;
    e('#memMin').value = u === 'adults' ? 18 : 0;
    e('#memMax').value = u === 'children' ? 17 : 110;
    filter();
  };
  ['memMin', 'memMax', 'memSearch'].forEach((id) => e('#' + id).addEventListener('input', filter));
  e('#memReset').onclick = () => {
    e('#memUniverse').value = 'children';
    e('#memMin').value = 0;
    e('#memMax').value = 17;
    e('#memSearch').value = '';
    filter();
  };
  function aplicarZoom(nuevo) {
    zoom = Math.min(ZOOM_MAX, Math.max(1, nuevo));
    pintarZoom();
    if (zoom === 1) viewport.scrollTop = 0;
    draw();
    if (zoom > 1) locate(); else schedule();
    e('#memStatus').setAttribute('data-zoom', String(zoom));
  }
  e('#memZoomIn').onclick = () => aplicarZoom(zoom >= 3 ? zoom * 1.5 : zoom * 2);
  e('#memZoomOut').onclick = () => aplicarZoom(zoom <= 3 ? zoom / 2 : zoom / 1.5);
  e('#memFit').onclick = () => aplicarZoom(1);
  e('#memPrev').onclick = () => choose(selected - 1);
  e('#memNext').onclick = () => choose(selected + 1);
  e('#memLocate').onclick = locate;
  e('#memPagePrev').onclick = () => { page--; table(); };
  e('#memPageNext').onclick = () => { page++; table(); };

  viewport.addEventListener('scroll', schedule, { passive: true });
  function indiceEn(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left - 12;
    const y = ev.clientY - rect.top + viewport.scrollTop - 12;
    const c = Math.floor(x / step), r = Math.floor(y / step), i = r * cols + c;
    return x >= 0 && y >= 0 && c < cols && i < filtered.length ? i : -1;
  }

  function tipPersona(ev) {
    if (!window.TIP) return;
    const i = indiceEn(ev);
    if (i < 0) { window.TIP.ocultar(); return; }
    const p = filtered[i];
    const edad = p.age === 0 ? 'Menos de 1 año' : p.age + (p.age === 1 ? ' año' : ' años');
    window.TIP.html({
      serie: 'Persona identificada · lista nominal',
      titulo: (p.english || p.name) + ' · ' + edad,
      detalle:
        '<p lang="ar" dir="rtl">' + safe(p.name) + '</p>' +
        '<p>Registro ' + fmt(i + 1) + ' de ' + fmt(filtered.length) + ' en esta selección.</p>' +
        '<p class="gTipHint">Un punto es una persona; el tamaño no varía.</p>',
      fuente: 'Tech for Palestine · listas del Ministerio de Salud de Gaza · corte 7 may 2026',
      punto: { x: ev.clientX, y: ev.clientY },
    });
  }

  canvas.addEventListener('click', (ev) => {
    const i = indiceEn(ev);
    if (i >= 0) choose(i, false);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    tipPersona(ev);
  });
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'touch') tipPersona(ev);
  });
  canvas.addEventListener('pointerleave', () => {
    if (window.TIP) window.TIP.ocultar();
  });
  canvas.addEventListener('keydown', (ev) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    if (ev.key in delta) { ev.preventDefault(); choose(selected + delta[ev.key]); }
    else if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); choose(ev.key === 'Home' ? 0 : filtered.length - 1); }
    else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); aplicarZoom(zoom >= 3 ? zoom * 1.5 : zoom * 2); }
    else if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); aplicarZoom(zoom <= 3 ? zoom / 2 : zoom / 1.5); }
    else if (ev.key === '0') { ev.preventDefault(); aplicarZoom(1); }
  });

  new ResizeObserver(schedule).observe(viewport);
  new MutationObserver(schedule).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  pintarZoom();
  pintarEscala();
  filter();
})();
