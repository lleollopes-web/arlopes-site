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

fetch('data/projetos.json')
  .then(r => r.json())
  .then(data => {
    lotes = data.lotes;
    renderStats(data.resumo);
    renderPortfolioCards(lotes);
    renderLegend(lotes);
    initMap();
  })
  .catch(err => console.error('Erro ao carregar projetos.json', err));

function renderLegend(lotes) {
  const legend = document.getElementById('mapLegend');
  const ufs = [...new Set(lotes.map(l => l.uf))].sort();
  const extra = ufs.map(uf => `<span><i style="background:${corDoUF(uf)}"></i> ${uf} — ${UF_NOMES[uf] || ''}</span>`).join('');
  legend.insertAdjacentHTML('beforeend', extra);
}

function renderStats(resumo) {
  const map = {
    statLotes: resumo.total_lotes,
    statKm: resumo.extensao_total_km,
    statEstados: resumo.total_estados,
    statEmpresas: resumo.total_empresas,
    statLotesHero: resumo.total_lotes,
    statKmHero: Math.round(resumo.extensao_total_km),
    statEstadosHero: resumo.total_estados,
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.dataset.count = value;
  });
  observeCounters();
}

function renderPortfolioCards(lotes) {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = lotes.map(l => `
    <div class="project-card">
      <div class="card-top">
        <span class="code">${l.uf} · Lote ${l.lote}</span>
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
let map, activeLayer = null;

// Paleta de cores por estado (UF) — uma cor fixa por estado atendido
const UF_COLORS = {
  AC: '#c9862e',
  AP: '#2f6f9e',
  CE: '#1c9169',
  GO: '#a1543a',
  PE: '#6b4fa0',
  PR: '#b3392f',
  RO: '#4d7c3a',
  SC: '#8a6d1f',
};
const UF_NOMES = {
  AC: 'Acre', AP: 'Amapá', CE: 'Ceará', GO: 'Goiás',
  PE: 'Pernambuco', PR: 'Paraná', RO: 'Rondônia', SC: 'Santa Catarina',
};
function corDoUF(uf) { return UF_COLORS[uf] || '#c9862e'; }

function initMap() {
  map = L.map('map', {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: false
  }).setView([-14.2, -51.9], 4);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 10,
    minZoom: 3,
  }).addTo(map);

  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());

  // 1) Malha federal completa, de fundo, em cinza neutro (contexto)
  fetch('data/rodovias.geojson')
    .then(r => r.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        style: () => ({ color: '#a7ada6', weight: 1.2, opacity: 0.55 }),
        onEachFeature: (feature, layer) => {
          layer.on('click', () => selectVazio(feature, layer));
        }
      }).addTo(map);
    })
    .catch(err => console.error('Erro ao carregar rodovias.geojson', err));

  // 2) Trechos realmente executados, recortados por SNV, coloridos por UF
  fetch('data/trechos-executados.geojson')
    .then(r => r.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        style: feature => ({
          color: corDoUF(feature.properties.uf),
          weight: 4,
          opacity: 0.95,
          dashArray: '10 6',
        }),
        onEachFeature: (feature, layer) => {
          layer.on('click', () => selectTrecho(feature, layer));
          layer.on('mouseover', () => layer.setStyle({ weight: 6, opacity: 1 }));
          layer.on('mouseout', () => { if (layer !== activeLayer) layer.setStyle({ weight: 4, opacity: 0.95 }); });
        }
      }).addTo(map);
    })
    .catch(err => console.error('Erro ao carregar trechos-executados.geojson', err));
}

function resetActive() {
  if (activeLayer) activeLayer.setStyle({ weight: 4, opacity: 0.95 });
  activeLayer = null;
}

function selectVazio(feature, layer) {
  resetActive();
  document.getElementById('panelEmpty').style.display = 'none';
  const content = document.getElementById('panelContent');
  content.style.display = 'block';
  document.getElementById('pBR').textContent = 'BR-' + feature.properties.Codigo_BR;
  document.getElementById('pUF').textContent = feature.properties.uf_list || '—';
  document.getElementById('pLotesList').innerHTML = `
    <div class="lote-empty">
      <p>Ainda não temos projeto executado neste trecho.</p>
      <span>${feature.properties.extensao_km ? Math.round(feature.properties.extensao_km) + ' km na malha federal' : ''}</span>
    </div>`;
}

function selectTrecho(feature, layer) {
  resetActive();
  activeLayer = layer;
  layer.setStyle({ weight: 6, opacity: 1 });
  layer.bringToFront();

  const p = feature.properties;
  document.getElementById('panelEmpty').style.display = 'none';
  const content = document.getElementById('panelContent');
  content.style.display = 'block';
  document.getElementById('pBR').textContent = p.rodovia;
  document.getElementById('pUF').textContent = `${p.uf} — ${UF_NOMES[p.uf] || ''}`;

  document.getElementById('pLotesList').innerHTML = `
    <div class="lote-card" style="border-left:4px solid ${corDoUF(p.uf)};">
      <div class="lote-head">
        <span class="lote-id">${p.uf} · ${p.lote_id}</span>
      </div>
      <div class="data-row"><span class="k">Extensão do trecho</span><span class="v">${p.extensao_km ? p.extensao_km.toLocaleString('pt-BR', {maximumFractionDigits:1}) + ' km' : '—'}</span></div>
      <div class="data-row"><span class="k">Período</span><span class="v">${p.periodo}</span></div>
      <div class="data-row"><span class="k">Empresa</span><span class="v">${p.empresa}</span></div>
      <div class="data-row"><span class="k">Serviço</span><span class="v">${p.tipo_servico}</span></div>
      <div class="data-row"><span class="k">Programa</span><span class="v">${p.programa}</span></div>
    </div>`;

  layer.bindPopup(`<span class="popup-br">${p.rodovia}</span>${p.uf} · ${p.lote_id}`).openPopup();
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
