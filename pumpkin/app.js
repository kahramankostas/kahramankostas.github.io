// State
// DATA_SRTS and DATA_EXCEL are now global constants loaded from data.js

// DOM Elements
const searchSection = document.getElementById('search-section');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsList = document.getElementById('results-list');
const resultCount = document.getElementById('result-count');

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (typeof DATA_SRTS !== 'undefined' && typeof DATA_EXCEL !== 'undefined') {
        console.log(`Loaded ${DATA_SRTS.length} SRTs and ${DATA_EXCEL.length} Excel rows.`);
        searchInput.focus();
    } else {
        alert("Veri dosyası (data.js) yüklenemedi. Lütfen generate_data.py dosyasını çalıştırın.");
    }
});


// --- Search Logic ---

function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return;

    resultsList.innerHTML = '';
    resultCount.textContent = 'Aranıyor...';

    // Defer to next tick to allow UI to update if synchronous
    setTimeout(() => {
        const results = searchInSrts(query);
        displayResults(results);
    }, 10);
}

function searchInSrts(query) {
    const results = [];

    // Use global DATA_SRTS
    for (const fileData of DATA_SRTS) {
        const blocks = parseSrtBlocks(fileData.content);

        for (const block of blocks) {
            if (block.text.toLowerCase().includes(query)) {
                results.push({
                    filename: fileData.filename,
                    timestamp: block.startTime,
                    seconds: parseTimestampToSeconds(block.startTime),
                    text: block.text
                });
            }
        }
    }
    return results;
}

function parseSrtBlocks(content) {
    // Normalize newlines
    content = content.replace(/\r\n/g, '\n');
    const blocksRaw = content.split('\n\n');
    const parsedBlocks = [];

    for (const block of blocksRaw) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            // lines[0] index (optional check)
            // lines[1] time --> time
            const timeLine = lines[1];
            if (timeLine && timeLine.includes('-->')) {
                const startTime = timeLine.split('-->')[0].trim();
                // Join remaining lines as text
                const textLines = lines.slice(2).join(' ');
                const cleanText = textLines.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags

                parsedBlocks.push({
                    startTime: startTime,
                    text: cleanText
                });
            }
        }
    }
    return parsedBlocks;
}

function parseTimestampToSeconds(timeStr) {
    // 00:00:02,230 -> seconds
    timeStr = timeStr.replace(',', '.');
    const parts = timeStr.split(':');
    if (parts.length === 3) {
        const h = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parseFloat(parts[2]);
        return Math.floor(h * 3600 + m * 60 + s);
    }
    return 0;
}

// --- Display Logic ---

function displayResults(results) {
    resultsList.innerHTML = '';
    resultCount.textContent = `${results.length} sonuç bulundu.`;

    if (results.length === 0) {
        resultsList.innerHTML = '<div class="empty-state">Sonuç bulunamadı.</div>';
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';

        const videoUrl = getVideoUrl(item.filename, item.seconds);

        card.innerHTML = `
            <div class="result-header">
                <span class="result-title">${item.filename}</span>
                <span class="result-time">${item.timestamp}</span>
            </div>
            <div class="result-text">${highlightText(item.text, searchInput.value)}</div>
            <div class="result-actions">
                ${videoUrl ?
                `<a href="${videoUrl}" target="_blank" class="btn primary" style="text-decoration:none; font-size: 0.9em;">İzle (Yeni Sekme)</a>` :
                `<button class="btn secondary" disabled title="Video URL Excel'de bulunamadı">Video Bulunamadı</button>`
            }
            </div>
        `;
        resultsList.appendChild(card);
    });
}

function highlightText(text, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<span style="background-color: #f1c40f; color: #000;">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Video URL Logic ---

function getVideoUrl(filename, seconds) {
    // Regex to find number: "1. Bölüm" or just digits
    const match = filename.match(/(\d+)\.\s*Bölüm/i);
    if (!match) return null; // Fallback? Current python only does this match

    const episodeNum = match[1]; // String "1"

    // Find in global DATA_EXCEL
    const row = DATA_EXCEL.find(r => {
        const title = (r['Title'] || '').toString();
        // Regex: (?<!\d)1\.\s*Bölüm
        const pattern = new RegExp(`(?<!\\d)${episodeNum}\\.\\s*Bölüm`, 'i');
        return pattern.test(title);
    });

    if (row && row['Video url']) {
        let url = row['Video url'];
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${seconds}s`;
    }

    return null;
}
