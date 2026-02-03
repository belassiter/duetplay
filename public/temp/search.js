// Global state
let allSongs = [];
const CHUNK_SIZE = 1024 * 1024 * 10; // 10MB approx (PapaParse handles this internally usually, but good for mental model)

const DOM = {
    searchInput: document.getElementById('search-input'),
    tracksFilter: document.getElementById('tracks-filter'),
    searchBtn: document.getElementById('search-btn'),
    resultsBody: document.getElementById('results-body'),
    resultsCount: document.getElementById('results-count'),
    statusContainer: document.getElementById('status-container'),
    statusText: document.getElementById('status-text'),
    loader: document.getElementById('loader'),
    countText: document.getElementById('count-text'),
    copyModal: document.getElementById('copy-modal'),
    modalCode: document.getElementById('modal-code')
};

function init() {
    console.log("Starting CSV Load...");
    
    // 1. Verify file exists before asking PapaParse (better error handling)
    DOM.statusText.textContent = "Connecting to database...";

    fetch('PDMX.csv', { method: 'HEAD' })
        .then(res => {
            if (!res.ok) throw new Error(`File not found (Status: ${res.status})`);
            const size = res.headers.get('content-length');
            const sizeMB = size ? (parseInt(size) / (1024 * 1024)).toFixed(1) : "?";
            console.log(`File check passed. Size: ${sizeMB} MB`);
            DOM.statusText.textContent = `Downloading ${sizeMB} MB library...`;
            
            startParsing();
        })
        .catch(err => {
            console.error(err);
            DOM.statusText.textContent = "Failed to load: " + err.message;
            DOM.statusContainer.className = "mb-4 p-4 bg-red-100 text-red-800 rounded flex items-center gap-4";
            DOM.loader.style.borderTopColor = "red";
            DOM.loader.style.animation = "none";
        });
}

function startParsing() {
    // 2. Start Parsing
    // Note: worker: true is disabled to ensure reliability across environments. 
    // This will cause a slight UI freeze during parsing, but 200MB is manageable on modern machines.
    Papa.parse('PDMX.csv', {
        download: true,
        header: true,
        worker: false,  
        skipEmptyLines: true,
        chunk: function(results) {
            // Process chunk
            requestAnimationFrame(() => {
                 const cleanRows = results.data.map(row => ({
                    t: row.title || row.song_name || "Unknown", // Title
                    c: row.composer_name || row.artist_name || "Unknown", // Composer
                    g: row.genres || "", // Genre
                    n: parseInt(row.n_tracks || "0"), // Num Tracks
                    r: parseFloat(row.rating || "0"), // Rating
                    p: row.mxl || "" // Path
                }));
                
                // Store minimal data to save memory
                allSongs = allSongs.concat(cleanRows);
                updateProgress(allSongs.length);
            });
        },
        complete: function() {
            console.log("Finished Loading.");
            finishLoading();
        },
        error: function(err) {
            console.error(err);
            DOM.statusText.textContent = "Error loading CSV: " + err.message;
            DOM.statusContainer.className = "mb-4 p-4 bg-red-100 text-red-800 rounded flex items-center gap-4";
            DOM.loader.style.borderTopColor = "red";
            DOM.loader.style.animation = "none";
        }
    });

    // Event Listeners
    DOM.searchBtn.addEventListener('click', performSearch);
    DOM.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

function updateProgress(count) {
    DOM.countText.textContent = `${count.toLocaleString()} songs loaded`;
}

function finishLoading() {
    DOM.statusText.textContent = "Ready to search.";
    DOM.loader.style.display = 'none';
    DOM.statusContainer.classList.remove('bg-blue-50', 'text-blue-800');
    DOM.statusContainer.classList.add('bg-green-50', 'text-green-800');
    
    DOM.searchInput.disabled = false;
    DOM.searchBtn.disabled = false;
    
    // Initial random or empty view
    renderResults(allSongs.slice(0, 20));
}

function performSearch() {
    const term = DOM.searchInput.value.toLowerCase().trim();
    const trackMode = DOM.tracksFilter.value; // "any", "2plus", "1"

    if (term.length < 2 && trackMode === 'any') {
        alert("Please enter at least 2 characters to search.");
        return;
    }

    DOM.resultsBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Searching...</td></tr>';

    // Set timeout to allow UI to render the "Searching..." text before blocking with filter
    setTimeout(() => {
        const results = allSongs.filter(song => {
            // Track Filter
            if (trackMode === '2plus' && song.n < 2) return false;
            if (trackMode === '1' && song.n !== 1) return false;

            // Text Filter
            if (!term) return true; // Just filtering by tracks
            
            return (
                (song.t && song.t.toLowerCase().includes(term)) ||
                (song.c && song.c.toLowerCase().includes(term)) ||
                (song.g && song.g.toLowerCase().includes(term))
            );
        });

        // Sort by rating desc? Or just take top matches.
        // Let's sort by rating desc for quality
        results.sort((a, b) => b.r - a.r);

        const limitedResults = results.slice(0, 100);
        renderResults(limitedResults, results.length);
    }, 10);
}

function renderResults(songs, totalMatchCount) {
    DOM.resultsBody.innerHTML = '';
    
    if (songs.length === 0) {
        DOM.resultsBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No results found.</td></tr>';
        DOM.resultsCount.textContent = '';
        return;
    }

    const fragment = document.createDocumentFragment();

    songs.forEach(song => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors";
        tr.innerHTML = `
            <td class="py-2 px-4 border-b font-medium text-gray-900">${escapeHtml(song.t)}</td>
            <td class="py-2 px-4 border-b text-gray-700">${escapeHtml(song.c)}</td>
            <td class="py-2 px-4 border-b text-sm text-gray-600">${escapeHtml(song.g)}</td>
            <td class="py-2 px-4 border-b text-center">${song.n}</td>
            <td class="py-2 px-4 border-b text-center font-mono text-sm">${song.r.toFixed(1)}</td>
            <td class="py-2 px-4 border-b text-center">
                <button onclick="copyPath('${escapeHtml(song.p)}')" 
                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-2 py-1 rounded border border-gray-300">
                    Copy Path
                </button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    DOM.resultsBody.appendChild(fragment);

    if (typeof totalMatchCount === 'number') {
        DOM.resultsCount.textContent = `Showing ${songs.length} of ${totalMatchCount.toLocaleString()} matches`;
    } else {
        DOM.resultsCount.textContent = `Showing ${songs.length} sample results`;
    }
}

// Global scope for onclick
window.copyPath = function(path) {
    if (!path) return;
    navigator.clipboard.writeText(path).then(() => {
        DOM.modalCode.textContent = path;
        DOM.copyModal.showModal();
    });
};

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Start
init();
