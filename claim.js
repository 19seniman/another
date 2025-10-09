// --- claimBot.js ---

const fs = require('fs');
const fetch = require('node-fetch'); 

// --- Konfigurasi File dan URL ---
const TOKEN_FILE = "token.txt";
const ACCOUNT_URL = "https://unlucid.ai/api/account";
const CLAIM_URL = "https://unlucid.ai/api/claim_free_gems";
// ------------------------------------

/**
 * Membaca dan mengembalikan token otentikasi dari token.txt.
 * @returns {string | null} Token otentikasi atau null jika gagal.
 */
function loadAuthToken() {
    try {
        if (!fs.existsSync(TOKEN_FILE)) {
            console.error(`❌ ERROR: File '${TOKEN_FILE}' tidak ditemukan.`);
            console.error("Pastikan Anda telah membuat file dan meletakkan token Anda di dalamnya.");
            return null;
        }
        const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
        if (!token) {
            console.error(`❌ ERROR: File '${TOKEN_FILE}' kosong.`);
            return null;
        }
        return token;
    } catch (e) {
        console.error(`❌ ERROR: Gagal membaca file ${TOKEN_FILE}: ${e.message}`);
        return null;
    }
}

/**
 * Membuat objek Header, mengirim token melalui Cookie.
 * @param {string} authToken Nilai dari __Secure-authjs.session-token.
 * @returns {object} Objek Header.
 */
function getHeaders(authToken) {
    // --- PERBAIKAN 401: Menggunakan Header 'Cookie' ---
    const sessionCookie = `__Secure-authjs.session-token=${authToken}`;
    
    return {
        // PERUBAHAN KRUSIAL: Kirim token melalui header 'Cookie'
        'Cookie': sessionCookie, 
        
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ScriptKlaimGemsAmanJS/1.0',
        'Origin': 'https://unlucid.ai',
        'Referer': 'https://unlucid.ai/gems'
    };
}

/**
 * Mengonversi timestamp milidetik ke string waktu yang mudah dibaca.
 */
function formatTime(timestampMs) {
    return new Date(timestampMs).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
}

/**
 * Fungsi utama untuk memeriksa waktu klaim dan melakukan klaim jika sudah waktunya.
 */
async function checkAndClaimGems() {
    // --- 0. MUAT TOKEN ---
    const authToken = loadAuthToken();
    if (!authToken) {
        return;
    }

    const HEADERS = getHeaders(authToken);
    const now = new Date();
    console.log(`[${formatTime(now.getTime())}] Memulai pengecekan status...`);
    
    // --- 1. MEMERIKSA STATUS AKUN (/api/account) ---
    let currentGems = 0;
    
    try {
        const response = await fetch(ACCOUNT_URL, { headers: HEADERS });
        
        if (response.status === 401) {
            console.error("❌ GAGAL: Error HTTP 401 (Unauthorized). Token Anda kemungkinan tidak valid, kedaluwarsa, atau format Cookie salah.");
            return;
        }
        if (!response.ok) {
            console.error(`❌ GAGAL: Error HTTP ${response.status} saat memeriksa akun.`);
            return;
        }
        
        const data = await response.json();
        const accountData = data.user || {};
        
        currentGems = accountData.gems || 0;
        const nextClaimTimestampMs = accountData.nextFreeGemsAt;
        
        console.log(`💰 Gems Saat Ini: ${currentGems}`);
        
        // Logika pemeriksaan waktu klaim
        const nextClaimTime = new Date(nextClaimTimestampMs);
        
        console.log(`🕒 Klaim Berikutnya Dijadwalkan: ${formatTime(nextClaimTimestampMs)}`);
        
        if (nextClaimTime > now) {
            // Belum waktunya klaim
            const timeDifferenceMs = nextClaimTime.getTime() - now.getTime();
            const totalSeconds = Math.floor(timeDifferenceMs / 1000);
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            console.log("------------------------------------------------");
            console.log(`🛑 TIDAK SIAP KLAIM. Waktu tunggu tersisa: ${hours} jam, ${minutes} menit, ${seconds} detik.`);
            return;
        }
        
    } catch (e) {
        console.error(`❌ GAGAL: Terjadi kesalahan saat memeriksa akun: ${e.message}`);
        return;
    }

    // --- 2. MELAKUKAN KLAIM JIKA SUDAH SIAP (/api/claim_free_gems) ---
    console.log("\n--- ✅ SIAP KLAIM. Mencoba mengirim permintaan klaim... ---");
    const payload = JSON.stringify({}); 
    
    try {
        const claimResponse = await fetch(CLAIM_URL, { 
            method: 'POST', 
            headers: HEADERS, 
            body: payload 
        });
        
        const claimData = await claimResponse.json();

        if (claimResponse.status === 429) {
            console.error("🛑 KLAIM DITOLAK (429 Too Many Requests). Cooldown belum selesai.");
            console.log("Pesan Server:", claimData);
            return;
        }
        if (!claimResponse.ok) {
            console.error(`❌ Error HTTP ${claimResponse.status} saat klaim.`);
            console.log("Pesan Server:", claimData);
            return;
        }
        
        const newNextClaimTimestampMs = claimData.user.nextFreeGemsAt;
        
        console.log("------------------------------------------------");
        console.log("🎉 KLAIM BERHASIL!");
        console.log(`⭐ Gems Baru Anda: ${claimData.user.gems}`);
        console.log(`🔄 Waktu Klaim Berikutnya Diperbarui ke: ${formatTime(newNextClaimTimestampMs)}`);
        
    } catch (e) {
        console.error(`❌ Terjadi kesalahan koneksi saat klaim: ${e.message}`);
    }
}

// --- JALANKAN FUNGSI UTAMA ---
checkAndClaimGems();
