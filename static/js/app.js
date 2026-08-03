// State
let currentTab = 'map';
let map = null;
let currentLayers = [];
let isSubmitting = false;

// --- Toast Notification System ---
function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) { console.error(message); return; }

    const icons = {
        error: '',
        success: '',
        warning: ''
    };

    const toast = document.createElement('div');
    toast.className = `gm-toast gm-toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    const timer = setTimeout(() => dismissToast(toast), duration);

    toast.addEventListener('click', () => {
        clearTimeout(timer);
        dismissToast(toast);
    });
    toast.style.cursor = 'pointer';
}

function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('gm-toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// DOM Elements (legacy tabs kept for backend-compatible handlers)
const tabs = {
    segment: document.getElementById('tab-segment'),
    route: document.getElementById('tab-route'),
    compare: document.getElementById('tab-compare'),
    map: document.getElementById('tab-map')
};

const sections = {
    segment: document.getElementById('section-segment'),
    route: document.getElementById('section-route'),
    compare: document.getElementById('section-compare'),
    map: document.getElementById('section-map')
};

function switchTab(tabName) {
    if (currentTab === tabName) return;
    currentTab = tabName;
    Object.keys(tabs).forEach(key => {
        const btn = tabs[key];
        if (!btn) return;
        const active = key === tabName;
        btn.classList.toggle('is-active', active);
        if (active) {
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.removeAttribute('aria-current');
        }
    });
    if (tabName === 'map' && map) {
        setTimeout(() => google.maps.event.trigger(map, 'resize'), 300);
    }
}

// --- HELPER: Smooth numeric counter animation ---
function animateValue(element, start, end, duration = 650, decimals = 2) {
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = end.toFixed(decimals);
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeProgress;
        element.textContent = current.toFixed(decimals);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end.toFixed(decimals);
        }
    };
    window.requestAnimationFrame(step);
}

// --- SIDE PANEL (Google Maps place-details blade) ---
function openRoutePanel() {
    const panel = document.getElementById('results-container');
    if (!panel) return;
    panel.classList.add('gm-panel-open');
}

function closeRoutePanel() {
    const panel = document.getElementById('results-container');
    if (!panel) return;
    panel.classList.remove('gm-panel-open');
}

// --- PROFILE COLLAPSE TOGGLE ---
function initProfileToggle() {
    const toggle = document.getElementById('gm-profile-toggle');
    const body = document.getElementById('gm-profile-fields');
    if (!toggle || !body) return;
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        body.hidden = expanded;
    });
}

function initLoadSlider() {
    const slider = document.getElementById('map-load');
    const valDisplay = document.getElementById('map-load-val');
    if (slider && valDisplay) {
        const update = () => {
            valDisplay.textContent = slider.value + '%';
            slider.setAttribute('aria-valuenow', slider.value);
        };
        slider.addEventListener('input', update);
        update();
    }
}

// --- ZOOM CONTROLS ---
function initZoomControls() {
    const zoomIn = document.getElementById('btn-zoom-in');
    const zoomOut = document.getElementById('btn-zoom-out');
    if (!map) return;

    const adjustZoom = (delta) => {
        if (!map) return;
        const zoom = map.getZoom() + delta;
        map.setZoom(Math.max(1, Math.min(21, zoom)));
    };

    if (zoomIn) zoomIn.addEventListener('click', () => adjustZoom(1));
    if (zoomOut) zoomOut.addEventListener('click', () => adjustZoom(-1));
}

// Initialize Map & Controls
function initMap() {
    if (!document.getElementById('map-container')) return;
    if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps API not loaded yet.');
        return;
    }
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        zoomControl: false,
        fullscreenControl: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#5f6368" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#dadce0" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f7d8aa" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9ddef" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8eaed" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e8eaed" }] }
        ]
    });

    initLoadSlider();
    initProfileToggle();
    initZoomControls();

    // Close panel button
    const closeBtn = document.getElementById('btn-close-panel');
    if (closeBtn) closeBtn.addEventListener('click', closeRoutePanel);
}

// initMap is called as Google Maps callback; ensure global
window.initMap = initMap;

async function handleMapSubmit(e) {
    e.preventDefault();
    const source = document.getElementById('map-source').value.trim();
    const dest = document.getElementById('map-dest').value.trim();

    if (!source || !dest) {
        showToast('Please enter both source and destination.', 'warning');
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    const submitBtn = document.getElementById('btn-find-routes');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Finding Routes...';
    }

    const loader = document.getElementById('map-loader');

    loader.hidden = false;

    try {
        const speedVal = parseFloat(document.getElementById('map-speed')?.value);
        const accelVal = parseFloat(document.getElementById('map-accel')?.value);
        const hpVal = parseFloat(document.getElementById('map-hp')?.value);
        const tempVal = parseFloat(document.getElementById('map-temp')?.value);
        const loadVal = parseFloat(document.getElementById('map-load')?.value);

        const response = await fetch('/generate_routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: source,
                destination: dest,
                speed_limit: !isNaN(speedVal) ? speedVal : 45,
                acceleration: !isNaN(accelVal) ? accelVal : 0.6,
                horsepower: !isNaN(hpVal) ? hpVal : 120,
                temperature: !isNaN(tempVal) ? tempVal : 28,
                load: !isNaN(loadVal) ? loadVal : 55
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate routes');
        }

        // Clear previous layers
        currentLayers.forEach(layer => layer.setMap(null));
        currentLayers = [];

        let routes = data.routes || [];

        // Helper to extract fuel from any property key variation
        const getFuel = (r) => (r.total_fuel_l ?? r.total_fuel ?? r.estimated_fuel ?? r.fuel ?? 0);

        // Sort routes by fuel efficiency (lowest first)
        routes.sort((a, b) => getFuel(a) - getFuel(b));
        const topRoutes = routes.slice(0, 3); // take up to 3 routes
        const bestIdx = 0; // After sorting, 0 is the best

        const bounds = new google.maps.LatLngBounds();

        // Draw alternatives
        topRoutes.forEach((route, idx) => {
            const isBest = idx === bestIdx;

            const path = route.geometry.coordinates.map(coord => {
                const latLng = new google.maps.LatLng(coord[1], coord[0]);
                bounds.extend(latLng);
                return latLng;
            });

            const polyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: isBest ? '#1a73e8' : (idx === 1 ? '#5f6368' : '#9aa0a6'),
                strokeOpacity: isBest ? 1.0 : 0.6,
                strokeWeight: isBest ? 6 : 4,
                zIndex: isBest ? 10 : 1
            });

            polyline.setMap(map);
            currentLayers.push(polyline);

            if (isBest) {
                const startMarker = new google.maps.Marker({
                    position: path[0],
                    map: map,
                    title: 'Start',
                    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                });
                const endMarker = new google.maps.Marker({
                    position: path[path.length - 1],
                    map: map,
                    title: 'End',
                    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                });
                currentLayers.push(startMarker, endMarker);
            }
        });

        map.fitBounds(bounds);

        // Update UI with animated numbers for best route data
        const bestRoute = topRoutes[bestIdx];
        const liters = getFuel(bestRoute);
        const co2Footprint = liters * 2.31; // Average 2.31 kg CO2 per liter of fuel

        animateValue(document.getElementById('map-fuel-val'), 0, liters, 750, 2);
        animateValue(document.getElementById('map-dist-val'), 0, bestRoute.distance_m / 1000, 600, 1);
        animateValue(document.getElementById('map-time-val'), 0, Math.round(bestRoute.duration_s / 60), 600, 0);
        animateValue(document.getElementById('map-co2-val'), 0, co2Footprint, 750, 2);

        // Update comparison cards using safe DOM construction
        const comparisonsContainer = document.getElementById('route-comparisons');
        comparisonsContainer.innerHTML = '';

        topRoutes.forEach((route, idx) => {
            const isBest = idx === bestIdx;
            const rLiters = getFuel(route);
            const rCo2 = rLiters * 2.31;
            const rDistKm = (route.distance_m / 1000).toFixed(1);
            const rTimeMin = Math.round(route.duration_s / 60);

            const card = buildRouteCard(idx, isBest, rLiters, rDistKm, rTimeMin, rCo2);
            comparisonsContainer.appendChild(card);
        });

        loader.hidden = true;

        // Slide out the details panel (Google Maps place-details blade)
        openRoutePanel();

        showToast(`Found ${topRoutes.length} routes. Best: ${liters.toFixed(2)}L`, 'success', 3000);

    } catch (err) {
        console.error(err);
        loader.hidden = true;
        showToast(err.message || 'Failed to generate routes. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Find Routes';
        }
    }
}

// Build a route comparison card using safe DOM methods
function buildRouteCard(idx, isBest, liters, distKm, timeMin, co2) {
    const card = document.createElement('div');
    card.className = `gm-route-card${isBest ? ' gm-best' : ''}`;

    const head = document.createElement('div');
    head.className = 'gm-route-card-head';

    const name = document.createElement('span');
    name.className = 'gm-route-card-name';
    name.textContent = `Route ${idx + 1}`;

    const badge = document.createElement('span');
    badge.className = `gm-route-badge${isBest ? '' : ' gm-alt'}`;
    badge.textContent = isBest ? 'Best' : `Alt ${idx}`;
    head.appendChild(name);
    head.appendChild(badge);
    card.appendChild(head);

    const fuel = document.createElement('div');
    fuel.className = 'gm-route-fuel';
    fuel.innerHTML = `${liters.toFixed(2)} <span>L</span>`;
    card.appendChild(fuel);

    const metrics = document.createElement('div');
    metrics.className = 'gm-route-metrics';
    metrics.innerHTML = `
        <span>Distance <b>${escapeHtml(String(distKm))} km</b></span>
        <span>Time <b>${escapeHtml(String(timeMin))} min</b></span>
        <span>CO₂ <b>${co2.toFixed(1)} kg</b></span>
    `;
    card.appendChild(metrics);

    return card;
}

// --- SEGMENT PREDICTION (legacy, backend endpoint preserved) ---

async function handleSegmentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('segment-features').value;

    const features = input.split(',').map(num => parseFloat(num.trim())).filter(n => !isNaN(n));

    if (features.length === 0) {
        showToast('Please enter valid numerical features.', 'warning');
        return;
    }

    try {
        const response = await fetch('/predict_segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: features })
        });

        const data = await response.json();

        const resultDiv = document.getElementById('segment-result');
        const valueSpan = document.getElementById('segment-value');

        valueSpan.textContent = data.predicted_fuel.toFixed(2);

        resultDiv.classList.remove('hidden');

    } catch (err) {
        showToast('Error predicting segment. Please check your input.', 'error');
    }
}

// --- ROUTE PREDICTION (legacy, backend endpoint preserved) ---

function addSegmentInput() {
    const container = document.getElementById('segments-container');
    const count = container.children.length + 1;

    const div = document.createElement('div');
    div.className = "segment-input-group";
    div.innerHTML = `
        <input type="text" class="route-segment-input" placeholder="Features for Segment ${count} (e.g. 45, 0.6, 2.5, 1.2, 0.4, 28, 1, 300, 12)">
        <button type="button" onclick="removeSegmentInput(this)" aria-label="Remove segment">Remove</button>
    `;
    container.appendChild(div);
}

function removeSegmentInput(btn) {
    const row = btn.parentElement;
    row.remove();
}

function clearSegments() {
    const container = document.getElementById('segments-container');
    container.innerHTML = '';
    addSegmentInput();
}

async function handleRouteSubmit(e) {
    e.preventDefault();

    const inputs = document.querySelectorAll('.route-segment-input');
    const segments = [];

    inputs.forEach(input => {
        const val = input.value;
        if (val.trim()) {
            const row = val.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
            if (row.length > 0) segments.push(row);
        }
    });

    if (segments.length === 0) {
        showToast('Please enter at least one valid segment.', 'warning');
        return;
    }

    try {
        const response = await fetch('/predict_route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments: segments })
        });

        const data = await response.json();

        document.getElementById('route-result').hidden = false;
        animateValue(document.getElementById('route-total-value'), 0, data.total_fuel, 700, 2);

        const breakdown = document.getElementById('route-breakdown');
        breakdown.innerHTML = '';

        const maxVal = Math.max(...data.segment_fuel);

        data.segment_fuel.forEach((val, i) => {
            const widthPct = (val / maxVal) * 100;
            const bar = `
                <div class="gm-seg-row">
                    <span>Seg ${i + 1}</span>
                    <div class="gm-seg-bar">
                        <div class="gm-seg-fill" style="width: 0%;" id="seg-bar-${i}"></div>
                    </div>
                    <span>${val.toFixed(2)} L</span>
                </div>
            `;
            breakdown.innerHTML += bar;

            setTimeout(() => {
                const el = document.getElementById(`seg-bar-${i}`);
                if (el) el.style.width = `${widthPct}%`;
            }, 50 + i * 40);
        });

    } catch (err) {
        showToast('Error predicting route. Please check your segment data.', 'error');
    }
}

// --- COMPARE ROUTES (legacy, backend endpoint preserved) ---

async function handleCompareSubmit() {
    const input1 = document.getElementById('compare-route-1').value;
    const input2 = document.getElementById('compare-route-2').value;

    let route1, route2;

    try {
        route1 = parseRouteInput(input1);
        route2 = parseRouteInput(input2);
    } catch (e) {
        showToast('Invalid format. Please use JSON [[1,2],[3,4]] or standard array format.', 'warning');
        return;
    }

    if (route1.length === 0 || route2.length === 0) {
        showToast('Please enter valid data for both routes.', 'warning');
        return;
    }

    try {
        const response = await fetch('/compare_routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ routes: [route1, route2] })
        });

        const data = await response.json();
        const results = data.route_fuel;
        const winnerIdx = data.best_route_index;

        document.getElementById('compare-result').hidden = false;
        animateValue(document.getElementById('compare-val-0'), 0, results[0], 700, 2);
        animateValue(document.getElementById('compare-val-1'), 0, results[1], 700, 2);

        const card1 = document.getElementById('compare-card-1');
        const card2 = document.getElementById('compare-card-2');

        [card1, card2].forEach(c => {
            c.classList.remove('gm-best');
        });

        if (winnerIdx === 0) {
            highlightWinner(card1, "Route A");
        } else {
            highlightWinner(card2, "Route B");
        }

    } catch (err) {
        showToast('Error comparing routes. Please try again.', 'error');
    }
}

function highlightWinner(card, name) {
    card.classList.add('gm-best');
    const winnerBadge = document.getElementById('compare-winner');
    winnerBadge.textContent = `Winner: ${name} (Most Efficient)`;
}

function parseRouteInput(str) {
    try {
        const json = JSON.parse(str);
        if (Array.isArray(json)) return json;
    } catch (e) { }

    if (str.includes(';')) {
        return str.split(';').map(seg => seg.split(',').map(n => parseFloat(n)));
    }

    return JSON.parse(str.replace(/'/g, '"'));
}
