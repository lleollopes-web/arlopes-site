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
const counters = document.querySelectorAll('.num[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.4 });
counters.forEach(el => counterObserver.observe(el));

/* ============================================================
   DADOS DE PROJETOS (exemplo — trocar quando a planilha chegar)
   ============================================================ */
let projetosPorBR = {};

fetch('data/projetos-exemplo.json')
  .then(r => r.json())
  .then(data => {
    data.projetos.forEach(p => { projetosPorBR[p.codigo_br] = p; });
    renderPortfolioCards(data.projetos);
  })
  .catch(err => console.error('Erro ao carregar projetos-exemplo.json', err));

function renderPortfolioCards(projetos) {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = projetos.map(p => `
    <div class="project-card">
      <span class="code">BR-${p.codigo_br}</span>
      <p class="trecho">${p.trecho}</p>
      <div class="meta">
        <span>${p.uf.join('/')}</span>
        <span>${p.extensao_km} km</span>
        <span>${p.periodo}</span>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   MAPA (Leaflet)
   ============================================================ */
const map = L.map('map', {
  scrollWheelZoom: false,
  zoomControl: true,
  attributionControl: false
}).setView([-14.2, -51.9], 4);

// Fundo escuro minimalista (CartoDB dark, sem labels ostensivos)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  maxZoom: 10,
  minZoom: 3,
}).addTo(map);

map.on('focus', () => map.scrollWheelZoom.enable());
map.on('blur', () => map.scrollWheelZoom.disable());

let geojsonLayer;
let activeLayer = null;

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

function styleFor(feature) {
  const codigo = feature.properties.Codigo_BR;
  const temProjeto = !!projetosPorBR[codigo];
  return {
    color: temProjeto ? '#e8ab3d' : '#4c565a',
    weight: temProjeto ? 3 : 1.4,
    opacity: temProjeto ? 0.95 : 0.55,
    dashArray: temProjeto ? '10 6' : null,
  };
}

function selectRodovia(feature, layer) {
  const codigo = feature.properties.Codigo_BR;
  const projeto = projetosPorBR[codigo];

  // reset estilo do anterior
  if (activeLayer) geojsonLayer.resetStyle(activeLayer);
  activeLayer = layer;
  layer.setStyle({ color: '#ecebe4', weight: 4, opacity: 1 });
  layer.bringToFront();

  document.getElementById('panelEmpty').style.display = 'none';
  const content = document.getElementById('panelContent');
  content.style.display = 'block';

  document.getElementById('pBR').textContent = 'BR-' + codigo;
  document.getElementById('pUF').textContent = (feature.properties.uf_list || '—');

  if (projeto) {
    document.getElementById('pTrecho').textContent = projeto.trecho;
    document.getElementById('pExtensao').textContent = projeto.extensao_km + ' km';
    document.getElementById('pPeriodo').textContent = projeto.periodo;
    document.getElementById('pEmpresa').textContent = projeto.empresa_contratada;
    document.getElementById('pServico').textContent = projeto.tipo_servico;
    document.getElementById('pPrograma').textContent = projeto.programa;
    const statusEl = document.getElementById('pStatus');
    statusEl.textContent = projeto.status;
    statusEl.className = 'status-pill ' + (projeto.status === 'Concluído' ? 'done' : 'progress');
    statusEl.style.display = 'inline-block';
  } else {
    document.getElementById('pTrecho').textContent = '—';
    document.getElementById('pExtensao').textContent = (feature.properties.extensao_km ? Math.round(feature.properties.extensao_km) + ' km (malha total)' : '—');
    document.getElementById('pPeriodo').textContent = '—';
    document.getElementById('pEmpresa').textContent = '—';
    document.getElementById('pServico').textContent = '—';
    document.getElementById('pPrograma').textContent = 'Sem projeto executado ainda';
    document.getElementById('pStatus').style.display = 'none';
  }

  // popup rápido no próprio mapa também
  const popupHtml = `
    <span class="popup-br">BR-${codigo}</span>
    ${projeto ? projeto.trecho : 'Sem projeto executado por nós neste trecho.'}
  `;
  layer.bindPopup(popupHtml).openPopup();
}
