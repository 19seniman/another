// --- claimBot.js (Modifikasi) ---

// Ubah nama file
const TOKEN_FILE = "cookies.txt"; // Ubah dari token.txt

// --- Fungsi loadAuthToken (sekarang loadAuthCookies) ---
// Ubah nama fungsi agar lebih akurat
function loadAuthCookies() {
    try {
        if (!fs.existsSync(TOKEN_FILE)) {
            console.error(`❌ ERROR: File '${TOKEN_FILE}' tidak ditemukan.`);
            console.error("Pastikan Anda telah membuat file dengan format dua cookie.");
            return null;
        }
        const cookiesString = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
        if (!cookiesString) {
            console.error(`❌ ERROR: File '${TOKEN_FILE}' kosong.`);
            return null;
        }
        return cookiesString; // Mengembalikan seluruh string cookie
    } catch (e) {
        console.error(`❌ ERROR: Gagal membaca file ${TOKEN_FILE}: ${e.message}`);
        return null;
    }
}

// --- Fungsi getHeaders (menggunakan string cookie penuh) ---
function getHeaders(cookiesString) {
    return {
        // PERUBAHAN KRUSIAL: Nilai yang dimuat dari file langsung digunakan
        'Cookie': cookiesString, 
        
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ScriptKlaimGemsAmanJS/1.0',
        'Origin': 'https://unlucid.ai',
        'Referer': 'https://unlucid.ai/gems'
    };
}

// --- Di Fungsi checkAndClaimGems() ---
async function checkAndClaimGems() {
    // --- 0. MUAT COOKIES ---
    const cookiesString = loadAuthCookies(); // Ubah dari loadAuthToken
    if (!cookiesString) {
        return;
    }

    const HEADERS = getHeaders(cookiesString); // Masukkan string cookie penuh
    // ... Sisa logika skrip tetap sama
