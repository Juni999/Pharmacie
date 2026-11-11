/* GardePharm MG — données locales de démonstration pour Antananarivo. */
const pharmacies = [
  { id:1, name:'Pharmacie de l’Analakely', district:'Analakely', address:'12 rue de l’Indépendance', phone:'+261 34 05 123 45', status:'De Garde', coords:[-18.9071,47.5264], meds:[['Dafalgan','stock'],['Amoxicilline','stock'],['Spasfon','limited'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','stock']] },
  { id:2, name:'Pharmacie Ankatso Santé', district:'Ankatso', address:'Lot II A 45, Ankatso', phone:'+261 32 11 234 56', status:'Ouvert', coords:[-18.8877,47.5632], meds:[['Dafalgan','stock'],['Amoxicilline','limited'],['Spasfon','stock'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','out']] },
  { id:3, name:'Pharmacie du 67Ha', district:'67Ha', address:'Boulevard de Tokyo, 67Ha', phone:'+261 33 08 345 67', status:'De Garde', coords:[-18.9014,47.5024], meds:[['Dafalgan','stock'],['Amoxicilline','stock'],['Spasfon','stock'],['Paracétamol','limited'],['Vitamine C','out'],['Ibuprofène','stock']] },
  { id:4, name:'Pharmacie Ivandry Plus', district:'Ivandry', address:'Galerie Ivandry, Route des Hydrocarbures', phone:'+261 34 22 456 78', status:'Ouvert', coords:[-18.8755,47.5231], meds:[['Dafalgan','stock'],['Amoxicilline','out'],['Spasfon','limited'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','stock']] },
  { id:5, name:'Pharmacie Ambohipo', district:'Ambohipo', address:'Lot VA 34, route d’Ambohipo', phone:'+261 32 76 567 89', status:'Fermé', coords:[-18.9223,47.5487], meds:[['Dafalgan','out'],['Amoxicilline','stock'],['Spasfon','out'],['Paracétamol','stock'],['Vitamine C','limited'],['Ibuprofène','stock']] },
  { id:6, name:'Pharmacie Mahamasina', district:'Mahamasina', address:'Enceinte du stade, Mahamasina', phone:'+261 33 14 678 90', status:'De Garde', coords:[-18.9183,47.5169], meds:[['Dafalgan','limited'],['Amoxicilline','stock'],['Spasfon','stock'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','out']] },
  { id:7, name:'Pharmacie Anosibe', district:'Anosibe', address:'Marché d’Anosibe, bloc B', phone:'+261 34 45 789 01', status:'Ouvert', coords:[-18.9291,47.5121], meds:[['Dafalgan','stock'],['Amoxicilline','out'],['Spasfon','stock'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','limited']] },
  { id:8, name:'Pharmacie Tanjombato', district:'Tanjombato', address:'Route Digue, Tanjombato', phone:'+261 32 90 890 12', status:'Fermé', coords:[-18.9561,47.5054], meds:[['Dafalgan','stock'],['Amoxicilline','limited'],['Spasfon','out'],['Paracétamol','limited'],['Vitamine C','stock'],['Ibuprofène','stock']] },
  { id:9, name:'Pharmacie Andoharanofotsy', district:'Andoharanofotsy', address:'RN7, près du marché', phone:'+261 33 67 901 23', status:'De Garde', coords:[-19.0006,47.5276], meds:[['Dafalgan','stock'],['Amoxicilline','stock'],['Spasfon','limited'],['Paracétamol','stock'],['Vitamine C','stock'],['Ibuprofène','stock']] }
];

const map = L.map('map', { zoomControl:false }).setView([-18.8792,47.5079],13);
L.control.zoom({ position:'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors', maxZoom:19 }).addTo(map);
const markerLayer = L.layerGroup().addTo(map);
const markers = new Map();
const list = document.getElementById('pharmacy-list');
const input = document.getElementById('search-input');
const count = document.getElementById('result-count');
const reset = document.getElementById('reset-search');

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stockLabel = { stock:'En stock', limited:'Stock limité', out:'Rupture' };
const statusClass = status => status === 'Fermé' ? 'status-closed' : 'status-open';

function pinIcon(pharmacy) { return L.divIcon({ className:'', html:`<span class="custom-pin ${pharmacy.status === 'Fermé' ? 'closed' : ''}"><span>✚</span></span>`, iconSize:[34,34], iconAnchor:[8,28], popupAnchor:[9,-28] }); }
function popupContent(pharmacy) { return `<div><h3 class="popup-title">${pharmacy.name}</h3><p class="popup-line">${pharmacy.district} · ${pharmacy.address}</p><p class="popup-line popup-status">● ${pharmacy.status}</p><p class="popup-line">☎ ${pharmacy.phone}</p></div>`; }
function renderMarkers(items) {
  markerLayer.clearLayers(); markers.clear();
  items.forEach(pharmacy => { const marker = L.marker(pharmacy.coords, { icon:pinIcon(pharmacy), title:pharmacy.name }).bindPopup(popupContent(pharmacy)); marker.addTo(markerLayer); markers.set(pharmacy.id, marker); });
}
function pharmacyCard(pharmacy) {
  const meds = pharmacy.meds.map(([name, state]) => `<span class="stock-badge ${state === 'limited' ? 'limited' : state === 'out' ? 'out' : ''}">${name} · ${stockLabel[state]}</span>`).join('');
  return `<article class="pharmacy-card" data-id="${pharmacy.id}"><div class="card-top"><h3 class="pharmacy-name">${pharmacy.name}</h3><span class="status-badge ${statusClass(pharmacy.status)}">${pharmacy.status}</span></div><div class="card-meta"><span>${pharmacy.district}</span><span>${pharmacy.address}</span></div><div class="stock-row">${meds}</div><div class="card-actions"><span class="address">Disponible aujourd’hui</span><a class="call-button" href="tel:${pharmacy.phone.replace(/\s/g,'')}">☎ Appeler</a></div></article>`;
}
function focusPharmacy(id) { const pharmacy = pharmacies.find(item => item.id === id); const marker = markers.get(id); if (!pharmacy || !marker) return; document.querySelectorAll('.pharmacy-card').forEach(card => card.classList.toggle('is-selected', Number(card.dataset.id) === id)); map.flyTo(pharmacy.coords,15,{ duration:.8 }); marker.openPopup(); }
function render(query='') {
  const term = normalize(query.trim());
  const filtered = pharmacies.filter(pharmacy => !term || normalize([pharmacy.name, pharmacy.district, pharmacy.address, ...pharmacy.meds.map(med => med[0])].join(' ')).includes(term));
  list.innerHTML = filtered.length ? filtered.map(pharmacyCard).join('') : `<div class="empty-state"><strong>Aucun résultat trouvé</strong><p>Essayez un autre médicament ou quartier.</p></div>`;
  count.textContent = filtered.length; reset.hidden = !term; renderMarkers(filtered);
  list.querySelectorAll('.pharmacy-card').forEach(card => card.addEventListener('click', event => { if (event.target.closest('.call-button')) return; focusPharmacy(Number(card.dataset.id)); }));
}

input.addEventListener('input', event => render(event.target.value));
reset.addEventListener('click', () => { input.value=''; input.focus(); render(); });
document.querySelectorAll('[data-search]').forEach(button => button.addEventListener('click', () => { input.value=button.dataset.search; render(input.value); input.focus(); }));
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.focus(); } });
renderMarkers(pharmacies); render();
