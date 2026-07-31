
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
        error: '❌',
        success: '✅',
        warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<span aria-hidden="true">${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        dismissToast(toast);
    });
    toast.style.cursor = 'pointer';
}

function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// DOM Elements
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

// Functions

function switchTab(tabName) {
    if (currentTab === tabName) return;
    
    // Update State
    currentTab = tabName;
    
    // Update Tab Styles
    Object.keys(tabs).forEach(key => {
        const btn = tabs[key];
        if (!btn) return;
        if (key === tabName) {
            btn.classList.remove('text-earth-muted', 'hover:text-earth-text', 'bg-transparent', 'hover:bg-earth-inset');
            btn.classList.add('bg-sage-500', 'text-earth-base', 'hover:bg-sage-400');
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.classList.add('text-earth-muted', 'hover:text-earth-text', 'bg-transparent', 'hover:bg-earth-inset');
            btn.classList.remove('bg-sage-500', 'text-earth-base', 'hover:bg-sage-400');
            btn.removeAttribute('aria-current');
        }
    });

    // Update Section Visibility & Animation
    Object.keys(sections).forEach(key => {
        const section = sections[key];
        if (!section) return;
        if (key === tabName) {
            section.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-[100%]', '-translate-x-[100%]');
            section.classList.add('opacity-100', 'translate-x-0', 'z-10');
            
            // Re-render map if map tab is opened
            if (key === 'map' && map) {
                setTimeout(() => google.maps.event.trigger(map, 'resize'), 300);
            }
        } else {
            section.classList.remove('opacity-100', 'translate-x-0', 'z-10');
            section.classList.add('opacity-0', 'pointer-events-none', 'translate-x-[100%]');
        }
    });
}

// --- MAP ROUTE GENERATION ---

// Helper: Smooth numeric counter animation
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
        const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
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
        styles: [
            { elementType: "geometry", stylers: [{ color: "#0a0f0c" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f0c" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#92a89c" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2b22" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2a3d31" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1410" }] }
        ]
    });
    // Also initialize slider after map is ready
    initLoadSlider();
}

function initLoadSlider() {
    const slider = document.getElementById('map-load');
    const valDisplay = document.getElementById('map-load-val');
    if (slider && valDisplay) {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            valDisplay.textContent = val + '%';
            slider.setAttribute('aria-valuenow', val);
        });
    }
}

// initMap is now called as Google Maps callback; initLoadSlider is called from initMap
// Fallback: if Maps API loaded before script, ensure initMap is available globally
window.initMap = initMap;

async function handleMapSubmit(e) {
    e.preventDefault();
    const source = document.getElementById('map-source').value.trim();
    const dest = document.getElementById('map-dest').value.trim();
    
    if (!source || !dest) {
        showToast('Please enter both source and destination.', 'warning');
        return;
    }
    
    // Prevent double-submission
    if (isSubmitting) return;
    isSubmitting = true;
    
    const submitBtn = document.getElementById('btn-find-routes');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Finding Routes...';
    }
    
    const loader = document.getElementById('map-loader');
    const results = document.getElementById('map-results');
    
    loader.classList.remove('hidden');
    loader.classList.add('flex');
    results.classList.add('hidden');
    
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
                strokeColor: isBest ? '#3b9b6a' : (idx === 1 ? '#5b8eab' : '#e0a96d'),
                strokeOpacity: isBest ? 1.0 : 0.75,
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
        
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.classList.remove('hidden');
        resultsContainer.classList.remove('slide-up');
        void resultsContainer.offsetWidth; // trigger reflow
        resultsContainer.classList.add('slide-up');
        
        results.classList.remove('hidden');
        
        showToast(`Found ${topRoutes.length} routes. Best: ${liters.toFixed(2)}L`, 'success', 3000);
        
    } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        showToast(err.message || 'Failed to generate routes. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Find Routes';
        }
    }
}

// Build a route comparison card using safe DOM methods with strategic Earthy Eco theme coding
function buildRouteCard(idx, isBest, liters, distKm, timeMin, co2) {
    const staggerClass = `animate-stagger-${Math.min(idx + 1, 3)}`;
    
    // Color themes matching map polyline & Earthy Eco palette:
    // Route 1 (Best) = Muted Forest Sage (#3b9b6a)
    // Route 2 (Alt 1) = Muted Slate Blue (#5b8eab)
    // Route 3 (Alt 2) = Warm Ochre Sand (#e0a96d)
    const themes = [
        { border: 'border-sage-500/80', text: 'text-sage-400', badgeBg: 'bg-sage-500 text-earth-base', badgeText: 'BEST' },
        { border: 'border-water/50', text: 'text-water', badgeBg: 'bg-water/10 text-water border border-water/20', badgeText: 'ALT 1' },
        { border: 'border-sand/50', text: 'text-sand', badgeBg: 'bg-sand/10 text-sand border border-sand/20', badgeText: 'ALT 2' }
    ];

    const theme = themes[Math.min(idx, 2)];

    const card = document.createElement('div');
    card.className = `p-5 rounded-xl border ${theme.border} bg-earth-inset route-card-interactive relative overflow-hidden flex flex-col justify-between ${staggerClass}`;

    const topHeader = document.createElement('div');
    topHeader.className = 'flex justify-between items-center mb-3';
    
    const heading = document.createElement('h4');
    heading.className = 'text-xs font-bold uppercase tracking-wider text-earth-muted';
    heading.textContent = `Route ${idx + 1}`;
    topHeader.appendChild(heading);

    const badge = document.createElement('span');
    badge.className = `${theme.badgeBg} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`;
    badge.textContent = theme.badgeText;
    topHeader.appendChild(badge);

    card.appendChild(topHeader);

    const fuelDiv = document.createElement('div');
    fuelDiv.className = 'mb-4';
    fuelDiv.innerHTML = `<div class="text-3xl font-bold font-mono ${theme.text}">${liters.toFixed(2)} <span class="text-xs font-sans font-normal text-earth-muted">L</span></div><div class="text-[11px] text-earth-subtle uppercase tracking-wider mt-0.5">Est. Fuel</div>`;
    card.appendChild(fuelDiv);

    const metricsList = document.createElement('div');
    metricsList.className = 'divide-y divide-earth-border/60 text-xs pt-2 border-t border-earth-border';
    metricsList.innerHTML = `
        <div class="py-2 flex justify-between items-center">
            <span class="text-earth-muted">Distance</span>
            <span class="font-mono font-medium text-earth-text">${escapeHtml(String(distKm))} km</span>
        </div>
        <div class="py-2 flex justify-between items-center">
            <span class="text-earth-muted">Est. Time</span>
            <span class="font-mono font-medium text-earth-text">${escapeHtml(String(timeMin))} min</span>
        </div>
        <div class="py-2 flex justify-between items-center">
            <span class="text-earth-muted">Est. CO₂</span>
            <span class="font-mono font-semibold ${theme.text}">${co2.toFixed(1)} kg</span>
        </div>
    `;
    card.appendChild(metricsList);

    return card;
}


// --- SEGMENT PREDICTION ---

async function handleSegmentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('segment-features').value;
    
    // Parse features (simple CSV parsing)
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
        
        // Show user
        const resultDiv = document.getElementById('segment-result');
        const valueSpan = document.getElementById('segment-value');
        
        valueSpan.textContent = data.predicted_fuel.toFixed(2);
        
        resultDiv.classList.remove('hidden');
        // Re-trigger animation
        resultDiv.classList.remove('slide-up');
        void resultDiv.offsetWidth; // trigger reflow
        resultDiv.classList.add('slide-up');
        
    } catch (err) {
        showToast('Error predicting segment. Please check your input.', 'error');
    }
}


// --- ROUTE PREDICTION ---

function addSegmentInput() {
    const container = document.getElementById('segments-container');
    const count = container.children.length + 1;
    
    const div = document.createElement('div');
    div.className = "grid grid-cols-[1fr,auto] gap-4 items-center segment-input-group animate-stagger-1";
    div.innerHTML = `
        <input type="text" class="route-segment-input w-full bg-earth-inset border border-earth-borderLight rounded-lg px-4 py-2.5 text-earth-text font-mono text-sm focus:outline-none focus:border-sage-500 focus:ring-1 focus:ring-sage-500 transition-colors" placeholder="Features for Segment ${count} (e.g. 45, 0.6, 2.5, 1.2, 0.4, 28, 1, 300, 12)">
        <button type="button" onclick="removeSegmentInput(this)" class="text-earth-subtle hover:text-terracotta p-2 rounded-lg hover:bg-terracotta/10 transition-colors" aria-label="Remove segment">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
        </button>
    `;
    container.appendChild(div);
}

function removeSegmentInput(btn) {
    const row = btn.parentElement;
    row.style.transition = "opacity 200ms var(--ease-out-quart), transform 200ms var(--ease-out-quart)";
    row.style.opacity = "0";
    row.style.transform = "scale(0.95)";
    setTimeout(() => {
        row.remove();
    }, 200);
}

function clearSegments() {
    const container = document.getElementById('segments-container');
    container.style.transition = "opacity 150ms var(--ease-out-quart)";
    container.style.opacity = "0";
    setTimeout(() => {
        container.innerHTML = '';
        container.style.opacity = "1";
        addSegmentInput();
    }, 150);
}

async function handleRouteSubmit(e) {
    e.preventDefault();
    
    const inputs = document.querySelectorAll('.route-segment-input');
    const segments = [];
    
    inputs.forEach(input => {
        const val = input.value;
        if(val.trim()) {
            const row = val.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
            if(row.length > 0) segments.push(row);
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
        
        // Show result
        document.getElementById('route-result').classList.remove('hidden');
        animateValue(document.getElementById('route-total-value'), 0, data.total_fuel, 700, 2);
        
        const breakdown = document.getElementById('route-breakdown');
        breakdown.innerHTML = '';
        
        const maxVal = Math.max(...data.segment_fuel);
        
        data.segment_fuel.forEach((val, i) => {
            const widthPct = (val / maxVal) * 100;
            const bar = `
                <div class="flex items-center gap-3 text-sm animate-stagger-1">
                    <span class="w-20 text-earth-muted text-xs">Seg ${i+1}</span>
                    <div class="flex-1 h-3 bg-earth-base rounded-full overflow-hidden border border-earth-border">
                        <div class="h-full bg-sage-500 rounded-full transition-all duration-700 ease-out" style="width: 0%;" id="seg-bar-${i}"></div>
                    </div>
                    <span class="w-16 text-right font-mono font-medium text-earth-text text-xs">${val.toFixed(2)} L</span>
                </div>
            `;
            breakdown.innerHTML += bar;
            
            // Trigger smooth width fill
            setTimeout(() => {
                const el = document.getElementById(`seg-bar-${i}`);
                if (el) el.style.width = `${widthPct}%`;
            }, 50 + i * 40);
        });

    } catch (err) {
        showToast('Error predicting route. Please check your segment data.', 'error');
    }
}


// --- COMPARE ROUTES ---

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
        
        document.getElementById('compare-result').classList.remove('hidden');
        animateValue(document.getElementById('compare-val-0'), 0, results[0], 700, 2);
        animateValue(document.getElementById('compare-val-1'), 0, results[1], 700, 2);
        
        const card1 = document.getElementById('compare-card-1');
        const card2 = document.getElementById('compare-card-2');
        
        // Reset styles
        [card1, card2].forEach(c => {
            c.classList.remove('border-sage-500', 'bg-sage-500/10', 'border-terracotta', 'bg-terracotta/10');
            c.classList.add('border-earth-border', 'bg-earth-inset');
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
    card.classList.remove('border-earth-border', 'bg-earth-inset');
    card.classList.add('border-sage-500', 'bg-sage-500/10');
    
    const winnerBadge = document.getElementById('compare-winner');
    winnerBadge.textContent = `Winner: ${name} (Most Efficient)`;
}

function parseRouteInput(str) {
    // Attempt JSON parse
    try {
         const json = JSON.parse(str);
         if(Array.isArray(json)) return json;
    } catch(e) {}
    
    // Fallback: Manually parse [[...], [...]] string or just raw CSV lines if needed? 
    // The placeholder shows JSON-like arrays. Let's assume user inputs JSON-like structure for now as it's complex data.
    // If we want simpler: "1,2 ; 3,4" (semicolon separated segments)
    
    // Simple parser for "1,2; 3,4"
    if (str.includes(';')) {
        return str.split(';').map(seg => seg.split(',').map(n => parseFloat(n)));
    }
    
    // Else try to clean up brackets and parse
    // This is a quick hack for [[1,2], [3,4]] format if JSON.parse failed due to loose syntax
    return JSON.parse(str.replace(/'/g, '"'));
}
