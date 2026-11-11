/* ItadyFanafody — interface publique, sans collecte de position. */
const DATA_URL = 'data/pharmacies.json';
const TANA_COORDS = [-18.8792, 47.5079];
const stockLabel = { stock: 'En stock', limited: 'Stock limité', out: 'Rupture' };

let pharmacies = [];
let activeFilter = 'all';
let userLocation = null;
let map;
let markerLayer;
let userMarker;
const markers = new Map();

const list = document.getElementById('pharmacy-list');
const input = document.getElementById('search-input');
const count = document.getElementById('result-count');
const reset = document.getElementById('reset-search');
const summary = document.getElementById('results-summary');
const dataStatus = document.getElementById('data-status');
const locationButton = document.getElementById('locate-user');
const locationStatus = document.getElementById('location-status');
const mapElement = document.getElementById('map');

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const statusClass = status => status === 'Fermé' ? 'status-closed' : 'status-open';
const phoneHref = phone => String(phone || '').replace(/[^+\d]/g, '');

function setDataStatus(message, tone = 'default') {
  dataStatus.dataset.tone = tone;
  dataStatus.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
}

function formatVerification(timestamp) {
  if (!timestamp) return 'À confirmer par téléphone';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'À confirmer par téléphone';
  return `Confirmé le ${new Intl.DateTimeFormat('fr-MG', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

function isValidPharmacy(pharmacy) {
  return pharmacy && Number.isFinite(Number(pharmacy.id)) && typeof pharmacy.name === 'string'
    && Array.isArray(pharmacy.coords) && pharmacy.coords.length === 2
    && pharmacy.coords.every(coordinate => Number.isFinite(Number(coordinate)))
    && Array.isArray(pharmacy.meds);
}

function initializeMap() {
  if (!window.L) {
    mapElement.innerHTML = '<div class="map-fallback"><strong>Carte indisponible</strong><span>La liste et la recherche restent disponibles.</span></div>';
    return;
  }

  map = L.map('map', { zoomControl: false }).setView(TANA_COORDS, 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

function pinIcon(pharmacy) {
  return L.divIcon({
    className: '',
    html: `<span class="custom-pin ${pharmacy.status === 'Fermé' ? 'closed' : ''}"><span>✚</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [8, 28],
    popupAnchor: [9, -28],
  });
}

function popupContent(pharmacy) {
  return `<div><h3 class="popup-title">${escapeHtml(pharmacy.name)}</h3><p class="popup-line">${escapeHtml(pharmacy.district)} · ${escapeHtml(pharmacy.address)}</p><p class="popup-line popup-status">● ${escapeHtml(pharmacy.status)}</p><p class="popup-line">☎ ${escapeHtml(pharmacy.phone)}</p></div>`;
}

function renderMarkers(items) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  markers.clear();
  items.forEach(pharmacy => {
    const marker = L.marker(pharmacy.coords, { icon: pinIcon(pharmacy), title: pharmacy.name })
      .bindPopup(popupContent(pharmacy));
    marker.addTo(markerLayer);
    markers.set(pharmacy.id, marker);
  });
}

function distanceInKilometres(from, to) {
  const toRadians = value => value * Math.PI / 180;
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const latitudeDelta = toRadians(toLat - fromLat);
  const longitudeDelta = toRadians(toLng - fromLng);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasAvailableStock(pharmacy, term) {
  const medicines = pharmacy.meds.filter(([, state]) => state !== 'out');
  return !term || medicines.some(([name]) => normalize(name).includes(term));
}

function matchesFilter(pharmacy, term) {
  if (activeFilter === 'guard') return pharmacy.status === 'De Garde';
  if (activeFilter === 'open') return pharmacy.status !== 'Fermé';
  if (activeFilter === 'stock') return hasAvailableStock(pharmacy, term);
  return true;
}

function filteredPharmacies(query = '') {
  const term = normalize(query.trim());
  return pharmacies
    .filter(pharmacy => {
      const searchable = [pharmacy.name, pharmacy.district, pharmacy.address, ...pharmacy.meds.map(([name]) => name)].join(' ');
      return (!term || normalize(searchable).includes(term)) && matchesFilter(pharmacy, term);
    })
    .map(pharmacy => ({
      ...pharmacy,
      distance: userLocation ? distanceInKilometres(userLocation, pharmacy.coords) : null,
    }))
    .sort((first, second) => userLocation ? first.distance - second.distance : first.name.localeCompare(second.name, 'fr'));
}

function pharmacyCard(pharmacy) {
  const medicines = pharmacy.meds.map(([name, state]) => {
    const stateClass = state === 'limited' ? 'limited' : state === 'out' ? 'out' : '';
    return `<span class="stock-badge ${stateClass}">${escapeHtml(name)} · ${escapeHtml(stockLabel[state] || 'Inconnu')}</span>`;
  }).join('');
  const destination = encodeURIComponent(`${pharmacy.coords[0]},${pharmacy.coords[1]}`);
  const distance = pharmacy.distance === null ? '' : `<span class="distance">à ${pharmacy.distance.toFixed(1).replace('.', ',')} km</span>`;

  return `<article class="pharmacy-card" data-id="${Number(pharmacy.id)}">
    <div class="card-top"><h3 class="pharmacy-name">${escapeHtml(pharmacy.name)}</h3><span class="status-badge ${statusClass(pharmacy.status)}">${escapeHtml(pharmacy.status)}</span></div>
    <div class="card-meta"><span>${escapeHtml(pharmacy.district)}</span><span>${escapeHtml(pharmacy.address)}</span></div>
    <div class="stock-row">${medicines}</div>
    <div class="verification">${distance}${escapeHtml(formatVerification(pharmacy.lastVerifiedAt))}</div>
    <div class="card-actions">
      <a class="direction-button" href="https://www.google.com/maps/dir/?api=1&destination=${destination}" target="_blank" rel="noopener noreferrer">↗ Itinéraire</a>
      <a class="call-button" href="tel:${phoneHref(pharmacy.phone)}">☎ Appeler</a>
    </div>
  </article>`;
}

function resetSearchAndFilters() {
  input.value = '';
  setActiveFilter('all');
  input.focus();
}

function showEmptyState() {
  list.innerHTML = '<div class="empty-state"><strong>Aucun résultat trouvé</strong><p>Essayez un autre médicament, quartier ou filtre.</p><button id="clear-filters" class="text-button" type="button">Voir toutes les pharmacies</button></div>';
  document.getElementById('clear-filters').addEventListener('click', resetSearchAndFilters);
}

function render(query = '') {
  const filtered = filteredPharmacies(query);
  list.innerHTML = filtered.length ? filtered.map(pharmacyCard).join('') : '';
  if (!filtered.length) showEmptyState();
  count.textContent = filtered.length;
  summary.textContent = userLocation
    ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}, trié${filtered.length > 1 ? 's' : ''} par distance.`
    : `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}.`;
  reset.hidden = !query.trim() && activeFilter === 'all';
  renderMarkers(filtered);

  list.querySelectorAll('.pharmacy-card').forEach(card => card.addEventListener('click', event => {
    if (event.target.closest('a, button')) return;
    focusPharmacy(Number(card.dataset.id));
  }));
}

function focusPharmacy(id) {
  const pharmacy = pharmacies.find(item => Number(item.id) === id);
  const marker = markers.get(id);
  if (!pharmacy) return;
  document.querySelectorAll('.pharmacy-card').forEach(card => card.classList.toggle('is-selected', Number(card.dataset.id) === id));
  if (map && marker) {
    map.flyTo(pharmacy.coords, 15, { duration: 0.8 });
    marker.openPopup();
  }
}

function setActiveFilter(nextFilter) {
  activeFilter = nextFilter;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const isSelected = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
  render(input.value);
}

function showLoadingState() {
  list.setAttribute('aria-busy', 'true');
  list.innerHTML = '<div class="loading-state"><span class="loading-dot"></span><span>Chargement des pharmacies…</span></div>';
}

function showErrorState() {
  list.removeAttribute('aria-busy');
  list.innerHTML = '<div class="empty-state error-state"><strong>Les données sont indisponibles</strong><p>Vérifiez votre connexion puis réessayez.</p><button id="retry-load" class="text-button" type="button">Réessayer</button></div>';
  document.getElementById('retry-load').addEventListener('click', loadPharmacies);
}

async function loadPharmacies() {
  showLoadingState();
  setDataStatus('Mise à jour des données…');
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Réponse ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.pharmacies)) throw new Error('Format de données invalide');
    pharmacies = payload.pharmacies.filter(isValidPharmacy);
    if (!pharmacies.length) throw new Error('Aucune pharmacie valide');
    list.removeAttribute('aria-busy');
    setDataStatus(payload.source || 'Données disponibles', payload.isDemo ? 'warning' : 'success');
    render(input.value);
  } catch (error) {
    console.error('Impossible de charger les pharmacies.', error);
    setDataStatus('Données indisponibles — réessayez plus tard', 'error');
    showErrorState();
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'La géolocalisation n’est pas prise en charge par ce navigateur.';
    return;
  }
  locationButton.disabled = true;
  locationStatus.textContent = 'Recherche de votre position…';
  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = [position.coords.latitude, position.coords.longitude];
      locationButton.disabled = false;
      locationButton.textContent = '⌖ Position utilisée';
      locationStatus.textContent = 'Position utilisée uniquement pour trier les résultats.';
      if (map) {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker(userLocation, { radius: 8, color: '#fff', weight: 3, fillColor: '#1677a8', fillOpacity: 1 }).addTo(map);
        map.flyTo(userLocation, 13, { duration: 0.8 });
      }
      render(input.value);
    },
    () => {
      locationButton.disabled = false;
      locationStatus.textContent = 'Position non disponible. Vous pouvez continuer à rechercher manuellement.';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

input.addEventListener('input', event => render(event.target.value));
reset.addEventListener('click', resetSearchAndFilters);
locationButton.addEventListener('click', locateUser);
document.querySelectorAll('[data-search]').forEach(button => button.addEventListener('click', () => {
  input.value = button.dataset.search;
  render(input.value);
  input.focus();
}));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setActiveFilter(button.dataset.filter)));
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    input.focus();
  }
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}

initializeMap();
loadPharmacies();
