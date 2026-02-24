// --- Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker Registered!', reg))
            .catch(err => console.log('❌ Service Worker Failed', err));
    });
}

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCFccfNZzNSTcfBCYEh3kcXPjI4HRETCa0",
    authDomain: "fatehpur-hubs-a3a9f.firebaseapp.com",
    databaseURL: "https://fatehpur-hubs-a3a9f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fatehpur-hubs-a3a9f",
    storageBucket: "fatehpur-hubs-a3a9f.firebasestorage.app",
    messagingSenderId: "294360741451",
    appId: "1:294360741451:web:5a4a6ac0838f8542fabfce"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

// --- Recaptcha & Auth State ---
window.onload = function() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
    }
    
    auth.onAuthStateChanged(async (user) => {
        const loginSection = document.getElementById('login-section');
        const menuSection = document.getElementById('menu-section');
        const displayElement = document.getElementById('user-plan-display');

        if (user) {
            if(loginSection) loginSection.style.display = 'none';
            if(menuSection) menuSection.style.display = 'block';

            const name = localStorage.getItem('kbc_user') || "यूजर";
            const welcomeMsg = document.getElementById('welcome-msg');
            if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;

            // Plan Loading Logic
            const phone = user.phoneNumber.replace(/\D/g, '').slice(-10);
            database.ref('users/' + phone).on('value', (snapshot) => {
                const data = snapshot.val();
                if (displayElement) {
                    displayElement.style.display = "block";
                    if (data && data.plan) {
                        let planType = data.plan.trim().toLowerCase();
                        localStorage.setItem('db_plan', planType); // Store for game check
                        displayElement.innerHTML = `
                            <span>आपका प्लान: </span>
                            <span class="plan-badge ${planType}-badge">${planType.toUpperCase()}</span>
                        `;
                    } else {
                        localStorage.setItem('db_plan', 'free');
                        displayElement.innerHTML = `<span>आपका प्लान: </span><span class="plan-badge free-badge">FREE</span>`;
                    }
                }
            });
        } else {
            if(loginSection) loginSection.style.display = 'block';
            if(menuSection) menuSection.style.display = 'none';
        }
    });
};

// --- OTP Functions ---
function sendOTP() {
    const name = document.getElementById('username').value.trim();
    let phone = document.getElementById('mobile').value.trim();

    if (!name || phone.length < 10) {
        alert("❌ सही नाम और मोबाइल नंबर डालें");
        return;
    }

    localStorage.setItem('kbc_user', name);
    const phoneNumber = "+91" + phone.slice(-10);

    auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
        .then((result) => {
            window.confirmationResult = result;
            alert("✅ OTP भेज दिया गया!");
            document.getElementById('login-section').innerHTML = `
                <input type="number" id="otp-code" placeholder="OTP डालें" style="padding:10px; width:80%;">
                <button onclick="verifyOTP()" class="start-btn">वेरीफाई करें</button>
            `;
        }).catch((err) => { alert("Error: " + err.message); window.location.reload(); });
}

function verifyOTP() {
    const code = document.getElementById('otp-code').value.trim();
    window.confirmationResult.confirm(code).then(() => {
        window.location.reload();
    }).catch(() => alert("❌ गलत OTP!"));
}

// --- Button Logic (The Real Fix) ---

function startPractice() {
    // 10 free sawal wali file
    localStorage.setItem('selectedJson', 'free_questions.json'); 
    localStorage.setItem('forcePlan', 'free'); 
    window.location.href = "game.html";
}

function buyPlan(clickedPlan) {
    const dbPlan = localStorage.getItem('db_plan') || 'free';
    
    if (dbPlan === clickedPlan.toLowerCase()) {
        // Silver user ne silver click kiya -> Game Start
        localStorage.setItem('selectedJson', clickedPlan.toLowerCase() + "_questions.json"); 
        localStorage.setItem('forcePlan', 'premium'); 
        window.location.href = "game.html";
    } else {
        // Payment Page
        if (confirm(`Upgrade to ${clickedPlan.toUpperCase()}?`)) {
            window.open("https://rzp.io/rzp/I5geGyLS", '_self');
        }
    }
}

function logout() {
    localStorage.clear();
    auth.signOut().then(() => window.location.replace("index.html"));
}
