// --- claim.js ---

// Import modul yang dibutuhkan
const fs = require('fs');
const fetch = require('node-fetch'); // Perlu instalasi: npm install node-fetch

// --- Konfigurasi File dan URL ---
const COOKIES_FILE = "cookies.txt"; // Nama file yang diperbarui
const ACCOUNT_URL = "https://unlucid.ai/api/account";
const CLAIM_URL = "https://unlucid.ai/api/claim_free_gems";
// ------------------------------------

/**
 * Membaca dan mengembalikan string cookies dari cookies.txt.
 * @returns {string | null} String cookies gabungan atau null jika gagal.
 */
function loadAuthCookies() {
    try {
        if (!fs.existsSync(COOKIES_FILE)) {
            console.error(`❌ ERROR: File '${COOKIES_FILE}' tidak ditemukan.`);
            console.error("Pastikan Anda telah membuat file dan memasukkan cookie gabungan (cf_clearance dan session-token).");
            return null;
        }
        // Membaca seluruh konten file sebagai string
        const cookiesString = fs.readFileSync(COOKIES_FILE, 'utf8').trim();
        if (!cookiesString) {
            console.error(`❌ ERROR: File '${COOKIES_FILE}' kosong.`);
            return null;
        }
        return cookiesString; // Mengembalikan seluruh string cookie
    } catch (e) {
        console.error(`❌ ERROR: Gagal membaca file ${COOKIES_FILE}: ${e.message}`);
        return null;
    }
}

/**
 * Membuat objek Header, mengirim string cookie penuh melalui Header 'Cookie'.
 * @param {string} cookiesString Seluruh string cookies dari cookies.txt.
 * @returns {object} Objek Header.
 */
function getHeaders(cookiesString) {
    return {
        // SOLUSI 401: Mengirim seluruh string melalui Header 'Cookie'
        'Cookie': cookiesString, 
        
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
    // --- 0. MUAT COOKIES ---
    const cookiesString = loadAuthCookies();
    if (!cookiesString) {
        return;
    }

    const HEADERS = getHeaders(cookiesString);
    const now = new Date();
    console.log(`[${formatTime(now.getTime())}] Memulai pengecekan status...`);
    
    // --- 1. MEMERIKSA STATUS AKUN (/api/account) ---
    let currentGems = 0;
    
    try {
        const response = await fetch(ACCOUNT_URL, { headers: HEADERS });
        
        // Cek Error Otentikasi/Akses (401, 403, dll.)
        if (response.status === 401 || response.status === 403) {
            console.error(`❌ GAGAL: Error HTTP ${response.status} (Unauthorized/Forbidden). Cookies Anda tidak valid, kedaluwarsa, atau tidak lengkap.`);
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

// --- AKHIR FILE ---
