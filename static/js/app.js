
// State
let currentTab = 'segment';

// DOM Elements
const tabs = {
    segment: document.getElementById('tab-segment'),
    route: document.getElementById('tab-route'),
    compare: document.getElementById('tab-compare')
};

const sections = {
    segment: document.getElementById('section-segment'),
    route: document.getElementById('section-route'),
    compare: document.getElementById('section-compare')
};

// Functions

function switchTab(tabName) {
    if (currentTab === tabName) return;
    
    // Update State
    currentTab = tabName;
    
    // Update Tab Styles
    Object.keys(tabs).forEach(key => {
        const btn = tabs[key];
        if (key === tabName) {
            btn.classList.remove('text-slate-400', 'hover:text-white', 'bg-transparent');
            btn.classList.add('bg-brand-600', 'text-white', 'shadow-lg', 'shadow-brand-500/20');
        } else {
            btn.classList.add('text-slate-400', 'hover:text-white', 'bg-transparent');
            btn.classList.remove('bg-brand-600', 'text-white', 'shadow-lg', 'shadow-brand-500/20');
        }
    });

    // Update Section Visibility & Animation
    // We use a simple system: hidden sections are moved off-screen or faded out
    
    Object.keys(sections).forEach(key => {
        const section = sections[key];
        if (key === tabName) {
            section.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-[100%]', '-translate-x-[100%]');
            section.classList.add('opacity-100', 'translate-x-0', 'z-10');
        } else {
            section.classList.remove('opacity-100', 'translate-x-0', 'z-10');
            section.classList.add('opacity-0', 'pointer-events-none');
            // Optional: slide direction based on index could be cool, but keeping it simple
            section.classList.add('translate-x-[100%]'); // Move to right by default
        }
    });
}


// --- SEGMENT PREDICTION ---

async function handleSegmentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('segment-features').value;
    
    // Parse features (simple CSV parsing)
    const features = input.split(',').map(num => parseFloat(num.trim())).filter(n => !isNaN(n));
    
    if (features.length === 0) {
        alert("Please enter valid numerical features.");
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
        
        valueSpan.innerText = data.predicted_fuel.toFixed(2);
        
        resultDiv.classList.remove('hidden');
        // Re-trigger animation
        resultDiv.classList.remove('slide-up');
        void resultDiv.offsetWidth; // trigger reflow
        resultDiv.classList.add('slide-up');
        
    } catch (err) {
        console.error(err);
        alert("Error predicting segment.");
    }
}


// --- ROUTE PREDICTION ---

function addSegmentInput() {
    const container = document.getElementById('segments-container');
    const count = container.children.length + 1;
    
    const div = document.createElement('div');
    div.className = "grid grid-cols-[1fr,auto] gap-4 items-center segment-input-group slide-up";
    div.innerHTML = `
        <input type="text" class="route-segment-input w-full bg-dark-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all" placeholder="Features for Segment ${count} (comma separated)">
        <button type="button" onclick="this.parentElement.remove()" class="text-slate-500 hover:text-red-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
        </button>
    `;
    container.appendChild(div);
}

function clearSegments() {
    const container = document.getElementById('segments-container');
    container.innerHTML = '';
    addSegmentInput(); // Add one back
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
        alert("Please enter at least one valid segment.");
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
        document.getElementById('route-total-value').innerText = data.total_fuel.toFixed(2);
        
        const breakdown = document.getElementById('route-breakdown');
        breakdown.innerHTML = '';
        
        const maxVal = Math.max(...data.segment_fuel);
        
        data.segment_fuel.forEach((val, i) => {
            const widthPct = (val / maxVal) * 100;
            const bar = `
                <div class="flex items-center gap-3 text-sm">
                    <span class="w-20 text-slate-400">Seg ${i+1}</span>
                    <div class="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
                        <div class="h-full bg-brand-500 rounded-full" style="width: ${widthPct}%"></div>
                    </div>
                    <span class="w-16 text-right font-medium text-slate-300">${val.toFixed(2)}</span>
                </div>
            `;
            breakdown.innerHTML += bar;
        });

    } catch (err) {
        console.error(err);
        alert("Error predicting route.");
    }
}


// --- COMPARE ROUTES ---

async function handleCompareSubmit() {
    const input1 = document.getElementById('compare-route-1').value;
    const input2 = document.getElementById('compare-route-2').value;
    
    let route1, route2;
    
    try {
        // Try parsing JSON first, else simple CSV lines
        route1 = parseRouteInput(input1);
        route2 = parseRouteInput(input2);
    } catch (e) {
        alert("Invalid format. Please use JSON [[1,2],[3,4]] or standard array format.");
        return;
    }
    
    if (route1.length === 0 || route2.length === 0) {
        alert("Please enter valid data for both routes.");
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
        document.getElementById('compare-val-0').innerText = results[0].toFixed(2);
        document.getElementById('compare-val-1').innerText = results[1].toFixed(2);
        
        const card1 = document.getElementById('compare-card-1');
        const card2 = document.getElementById('compare-card-2');
        
        // Reset styles
        [card1, card2].forEach(c => {
            c.classList.remove('border-brand-500', 'bg-brand-500/10', 'border-red-500', 'bg-red-500/10');
            c.classList.add('border-slate-700/50', 'bg-dark-900/50');
        });
        
        // Highlight winner (Lower is better usually for fuel? Assuming "Optimization" means check logic. 
        // Backend: best_index = int(np.argmin(route_results)) -> YES, lowest is best.)
        
        if (winnerIdx === 0) {
            highlightWinner(card1, "Route A");
        } else {
            highlightWinner(card2, "Route B");
        }
        
    } catch (err) {
        console.error(err);
        alert("Error comparing routes.");
    }
}

function highlightWinner(card, name) {
    card.classList.remove('border-slate-700/50', 'bg-dark-900/50');
    card.classList.add('border-brand-500', 'bg-brand-500/10');
    
    const winnerBadge = document.getElementById('compare-winner');
    winnerBadge.innerText = `Winner: ${name} (Most Efficient)`;
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
