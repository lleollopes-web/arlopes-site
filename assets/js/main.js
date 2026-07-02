/* ============================================================
   MENU MOBILE
   ============================================================ */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ============================================================
   ANO NO RODAPÉ
   ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   REVEAL ON SCROLL
   ============================================================ */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

/* ============================================================
   CONTADORES ANIMADOS
   ============================================================ */
function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = eased * target;
    el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val)).toLocaleString('pt-BR') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.4 });

function observeCounters() {
  document.querySelectorAll('.num[data-count]').forEach(el => counterObserver.observe(el));
}

/* ============================================================
   DADOS DE PROJETOS (planilha real)
   ============================================================ */
let lotes = [];
let rodoviaIndex = {};      // codigo_br -> [ {lote, segmentos} ]

fetch('data/projetos.json')
  .then(r => r.json())
  .then(data => {
    lotes = data.lotes;
    buildRodoviaIndex();
    renderStats(data.resumo);
    renderPortfolioCards(lotes);
    initMap(); // só inicializa o mapa depois de termos o índice de rodovias
  })
  .catch(err => console.error('Erro ao carregar projetos.json', err));

function buildRodoviaIndex() {
  lotes.forEach(lote => {
    lote.rodovias.forEach(codigoCompleto => {
      const codigo = codigoCompleto.replace('BR-', '').trim();
      if (!rodoviaIndex[codigo]) rodoviaIndex[codigo] = [];
      const segmentosDaRodovia = lote.segmentos.filter(s => s.rodovia === codigoCompleto || s.rodovia === 'BR-' + codigo);
      rodoviaIndex[codigo].push({ lote, segmentos: segmentosDaRodovia });
    });
  });
}

function renderStats(resumo) {
  const map = {
    statLotes: resumo.total_lotes,
    statKm: resumo.extensao_total_km,
    statEstados: resumo.total_estados,
    statEmpresas: resumo.total_empresas,
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.dataset.count = value;
  });
  observeCounters();
}

function renderPortfolioCards(lotes) {
  const grid = document.getElementById('cardGrid');
  const statusClass = s => s === 'Encerrado' ? 'done' : (s === 'Em andamento' ? 'progress' : 'unknown');
  grid.innerHTML = lotes.map(l => `
    <div class="project-card">
      <div class="card-top">
        <span class="code">${l.uf} · Lote ${l.lote}</span>
        <span class="status-pill ${statusClass(l.status)}">${l.status}</span>
      </div>
      <p class="card-title">${l.rodovias.join(' · ')}</p>
      <p class="trecho">${l.tipo_servico} — ${l.programa}</p>
      <div class="meta">
        <span>${l.extensao_total_km.toLocaleString('pt-BR')} km</span>
        <span>${l.periodo}</span>
        <span>${l.empresa}</span>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   MAPA (Leaflet)
   ============================================================ */
let map, geojsonLayer, activeLayer = null;

function initMap() {
  map = L.map('map', {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: false
  }).setView([-14.2, -51.9], 4);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 10,
    minZoom: 3,
  }).addTo(map);

  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());

  fetch('data/rodovias.geojson')
    .then(r => r.json())
    .then(geojson => {
      geojsonLayer = L.geoJSON(geojson, {
        style: feature => styleFor(feature),
        onEachFeature: (feature, layer) => {
          layer.on('click', () => selectRodovia(feature, layer));
          layer.on('mouseover', () => {
            if (layer !== activeLayer) layer.setStyle({ color: '#ecebe4', weight: 3.5, opacity: 1 });
          });
          layer.on('mouseout', () => {
            if (layer !== activeLayer) layer.setStyle(styleFor(feature));
          });
        }
      }).addTo(map);
    })
    .catch(err => console.error('Erro ao carregar rodovias.geojson', err));
}

function styleFor(feature) {
  const codigo = feature.properties.Codigo_BR;
  const temProjeto = !!rodoviaIndex[codigo];
  return {
    color: temProjeto ? '#e8ab3d' : '#4c565a',
    weight: temProjeto ? 3 : 1.4,
    opacity: temProjeto ? 0.95 : 0.55,
    dashArray: temProjeto ? '10 6' : null,
  };
}

function selectRodovia(feature, layer) {
  const codigo = feature.properties.Codigo_BR;
  const projetos = rodoviaIndex[codigo] || [];

  if (activeLayer) geojsonLayer.resetStyle(activeLayer);
  activeLayer = layer;
  layer.setStyle({ color: '#ecebe4', weight: 4, opacity: 1 });
  layer.bringToFront();

  document.getElementById('panelEmpty').style.display = 'none';
  const content = document.getElementById('panelContent');
  content.style.display = 'block';

  document.getElementById('pBR').textContent = 'BR-' + codigo;
  document.getElementById('pUF').textContent = feature.properties.uf_list || '—';

  const list = document.getElementById('pLotesList');

  if (projetos.length === 0) {
    list.innerHTML = `
      <div class="lote-empty">
        <p>Ainda não temos projeto executado neste trecho.</p>
        <span>${feature.properties.extensao_km ? Math.round(feature.properties.extensao_km) + ' km na malha federal' : ''}</span>
      </div>`;
  } else {
    list.innerHTML = `
      <div class="lote-count">${projetos.length} projeto${projetos.length > 1 ? 's' : ''} nesta rodovia</div>
      ` + projetos.map(({ lote, segmentos }) => {
        const extSeg = segmentos.reduce((sum, s) => sum + (s.extensao_km || 0), 0);
        return `
        <div class="lote-card">
          <div class="lote-head">
            <span class="lote-id">${lote.uf} · Lote ${lote.lote}</span>
            <span class="status-pill ${lote.status === 'Encerrado' ? 'done' : 'progress'}">${lote.status}</span>
          </div>
          <div class="data-row"><span class="k">Extensão nesta BR</span><span class="v">${extSeg ? extSeg.toLocaleString('pt-BR', {maximumFractionDigits:1}) + ' km' : '—'}</span></div>
          <div class="data-row"><span class="k">Extensão total do lote</span><span class="v">${lote.extensao_total_km.toLocaleString('pt-BR')} km</span></div>
          <div class="data-row"><span class="k">Período</span><span class="v">${lote.periodo}</span></div>
          <div class="data-row"><span class="k">Empresa</span><span class="v">${lote.empresa}</span></div>
          <div class="data-row"><span class="k">Serviço</span><span class="v">${lote.tipo_servico}</span></div>
          <div class="data-row"><span class="k">Programa</span><span class="v">${lote.programa}</span></div>
        </div>`;
      }).join('');
  }

  const popupHtml = `
    <span class="popup-br">BR-${codigo}</span>
    ${projetos.length ? projetos.length + ' projeto(s) executado(s) nesta rodovia' : 'Sem projeto executado por nós neste trecho.'}
  `;
  layer.bindPopup(popupHtml).openPopup();
}

/* ============================================================
   MARQUEE DE PARCEIROS (scroll horizontal automático)
   ============================================================ */
(function setupMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  // duplica o conteúdo para permitir loop contínuo
  track.innerHTML += track.innerHTML;
})();
