const fs = require('fs');
const node_fetch = require('node-fetch');
const fetch = node_fetch.default || node_fetch; // Coba ambil .default, jika tidak ada, gunakan objek utama

// --- Konfigurasi File dan URL ---
const ACCOUNTS_FILE = "accounts.json"; // Nama file yang diperbarui
const ACCOUNT_URL = "https://unlucid.ai/api/account";
const CLAIM_URL = "https://unlucid.ai/api/claim_free_gems";
// ------------------------------------

/**
 * Membaca dan mengembalikan daftar akun dari accounts.json.
 * @returns {Array | null} Daftar akun atau null jika gagal.
 */
function loadAccounts() {
    try {
        if (!fs.existsSync(ACCOUNTS_FILE)) {
            console.error(`❌ ERROR: File '${ACCOUNTS_FILE}' tidak ditemukan.`);
            console.error("Pastikan Anda telah membuat file accounts.json.");
            return null;
        }
        const jsonString = fs.readFileSync(ACCOUNTS_FILE, 'utf8').trim();
        const accounts = JSON.parse(jsonString);
        if (!Array.isArray(accounts) || accounts.length === 0) {
            console.error(`❌ ERROR: File '${ACCOUNTS_FILE}' tidak valid atau kosong.`);
            return null;
        }
        return accounts; 
    } catch (e) {
        console.error(`❌ ERROR: Gagal membaca/memparsing file ${ACCOUNTS_FILE}: ${e.message}`);
        return null;
    }
}

/**
 * Membuat objek Header, mengirim string cookie penuh melalui Header 'Cookie'.
 */
function getHeaders(cookiesString) {
    return {
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
 * Melakukan pengecekan dan klaim untuk satu akun.
 */
async function processAccount(account) {
    const { name, cookies } = account;
    const HEADERS = getHeaders(cookies);
    const now = new Date();

    console.log(`\n================================================`);
    console.log(`[${formatTime(now.getTime())}] 🤖 MEMPROSES AKUN: ${name}`);
    console.log(`================================================`);

    // --- 1. MEMERIKSA STATUS AKUN (/api/account) ---
    let currentGems = 0;
    
    try {
        const response = await fetch(ACCOUNT_URL, { headers: HEADERS });
        const data = await response.json();
        
        if (response.status === 401 || response.status === 403) {
            console.error(`❌ GAGAL: Error HTTP ${response.status} (Unauthorized/Forbidden). Cookies kedaluwarsa atau salah.`);
            return;
        }
        if (!response.ok) {
            console.error(`❌ GAGAL: Error HTTP ${response.status} saat memeriksa akun.`);
            return;
        }
        
        const accountData = data.user || {};
        currentGems = accountData.gems || 0;
        const nextClaimTimestampMs = accountData.nextFreeGemsAt;
        const nextClaimTime = new Date(nextClaimTimestampMs);
        
        console.log(`💰 Gems Saat Ini: ${currentGems}`);
        console.log(`🕒 Klaim Berikutnya Dijadwalkan: ${formatTime(nextClaimTimestampMs)}`);
        
        if (nextClaimTime > now) {
            // Belum waktunya klaim
            const timeDifferenceMs = nextClaimTime.getTime() - now.getTime();
            const totalSeconds = Math.floor(timeDifferenceMs / 1000);
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            
            console.log(`🛑 TIDAK SIAP KLAIM. Waktu tunggu tersisa: ${hours} jam, ${minutes} menit.`);
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
            return;
        }
        if (!claimResponse.ok) {
            console.error(`❌ Error HTTP ${claimResponse.status} saat klaim.`);
            return;
        }
        
        const newNextClaimTimestampMs = claimData.user.nextFreeGemsAt;
        
        console.log("🎉 KLAIM BERHASIL!");
        console.log(`⭐ Gems Baru Anda: ${claimData.user.gems}`);
        console.log(`🔄 Waktu Klaim Berikutnya Diperbarui ke: ${formatTime(newNextClaimTimestampMs)}`);
        
    } catch (e) {
        console.error(`❌ Terjadi kesalahan koneksi saat klaim: ${e.message}`);
    }
}

/**
 * Fungsi utama untuk menjalankan semua akun secara berurutan.
 */
async function runAllAccounts() {
    const accounts = loadAccounts();
    if (!accounts) return;

    for (const account of accounts) {
        // Tunggu hingga setiap akun selesai diproses sebelum melanjutkan ke akun berikutnya
        await processAccount(account);
        // Tambahkan jeda singkat antar akun untuk menghindari server overload
        await new Promise(resolve => setTimeout(resolve, 5000)); 
    }
    console.log(`\n--- Selesai memproses ${accounts.length} akun. ---`);
}

// --- JALANKAN FUNGSI UTAMA ---
runAllAccounts();
