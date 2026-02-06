// Global state
let allSongs = [];
let currentResults = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 50;
const CHUNK_SIZE = 1024 * 1024 * 10; 

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
    modalCode: document.getElementById('modal-code'),
    pagination: document.getElementById('pagination')
};

function init() {
    console.log("Starting CSV Load...");
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
    Papa.parse('PDMX.csv', {
        download: true,
        header: true,
        worker: false,  
        skipEmptyLines: true,
        chunk: function(results) {
            requestAnimationFrame(() => {
                 const cleanRows = results.data.map(row => ({
                    t: row.title || row.song_name || "Unknown", 
                    c: row.composer_name || row.artist_name || "Unknown", 
                    g: row.genres || "", 
                    n: parseInt(row.n_tracks || "0"), 
                    r: parseFloat(row.rating || "0"), 
                    p: row.mxl || "" 
                }));
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
    
    // Initial random view
    currentResults = allSongs.slice(0, 50);
    renderPage();
}

function performSearch() {
    const term = DOM.searchInput.value.toLowerCase().trim();
    const trackMode = DOM.tracksFilter.value; 

    if (term.length < 2 && trackMode === 'any') {
        alert("Please enter at least 2 characters to search.");
        return;
    }

    DOM.resultsBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Searching...</td></tr>';
    DOM.pagination.innerHTML = '';

    setTimeout(() => {
        const results = allSongs.filter(song => {
            // Track Filter
            if (trackMode !== 'any') {
                 if (trackMode === '5plus') {
                     if (song.n < 5) return false;
                 } else {
                     if (song.n !== parseInt(trackMode)) return false;
                 }
            }

            // Text Filter
            if (!term) return true; 
            
            return (
                (song.t && song.t.toLowerCase().includes(term)) ||
                (song.c && song.c.toLowerCase().includes(term)) ||
                (song.g && song.g.toLowerCase().includes(term))
            );
        });

        results.sort((a, b) => b.r - a.r);

        currentResults = results;
        currentPage = 1;
        renderPage();
    }, 10);
}

function renderPage() {
    const total = currentResults.length;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const slice = currentResults.slice(start, end);
    
    renderResults(slice, total);
    renderPagination(total);
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
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalMatchCount);
    
    DOM.resultsCount.textContent = `Showing ${start}-${end} of ${totalMatchCount.toLocaleString()} matches`;
}

function renderPagination(total) {
    DOM.pagination.innerHTML = '';
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const createBtn = (text, page, active = false, disabled = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `px-3 py-1 rounded border text-sm ${
            active 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
        
        if (!disabled && !active) {
            btn.onclick = () => {
                currentPage = page;
                renderPage();
            };
        }
        return btn;
    };

    // Prev
    DOM.pagination.appendChild(createBtn('Prev', currentPage - 1, false, currentPage === 1));

    // Simple range: Current, +/- 2
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
         DOM.pagination.appendChild(createBtn('1', 1));
         if (startPage > 2) {
             const span = document.createElement('span');
             span.textContent = '...';
             span.className = "px-2 text-gray-500";
             DOM.pagination.appendChild(span);
         }
    }

    for (let i = startPage; i <= endPage; i++) {
        DOM.pagination.appendChild(createBtn(i.toString(), i, i === currentPage));
    }

    if (endPage < totalPages) {
         if (endPage < totalPages - 1) {
             const span = document.createElement('span');
             span.textContent = '...';
             span.className = "px-2 text-gray-500";
             DOM.pagination.appendChild(span);
         }
         DOM.pagination.appendChild(createBtn(totalPages.toString(), totalPages));
    }

    // Next
    DOM.pagination.appendChild(createBtn('Next', currentPage + 1, false, currentPage === totalPages));
}

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
