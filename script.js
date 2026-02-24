                                  }
// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker Registered!', reg))
            .catch(err => console.log('❌ Service Worker Failed', err));
    });
}

// --- Firebase Config (Fatehpur Hubs प्रोजेक्ट) ---
const firebaseConfig = {
    apiKey: "AIzaSyCFccfNZzNSTcfBCYEh3kcXPjI4HRETCa0",
    authDomain: "fatehpur-hubs-a3a9f.firebaseapp.com",
    databaseURL: "https://fatehpur-hubs-a3a9f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fatehpur-hubs-a3a9f",
    storageBucket: "fatehpur-hubs-a3a9f.firebasestorage.app",
    messagingSenderId: "294360741451",
    appId: "1:294360741451:web:5a4a6ac0838f8542fabfce"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

// --- Auth State Monitor (Login/Logout Check) ---
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
            // Login Hai
            if(loginSection) loginSection.style.display = 'none';
            if(menuSection) menuSection.style.display = 'block';

            const name = localStorage.getItem('kbc_user') || "यूजर";
            const welcomeMsg = document.getElementById('welcome-msg');
            if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;

            // Database se plan load karein
            const tenDigitPhone = user.phoneNumber.slice(-10);
            database.ref('users/' + tenDigitPhone).on('value', (snapshot) => {
                const data = snapshot.val();
                if (displayElement) {
                    displayElement.style.display = "block";
                    if (data && data.plan) {
                        let planType = data.plan.trim().toLowerCase();
                        let expiry = data.expiry ? new Date(data.expiry).toLocaleDateString('hi-IN') : "N/A";
                        // Global plan status save karein
                        localStorage.setItem('db_plan', planType);
                        displayElement.innerHTML = `
                            <span>आपका प्लान: </span>
                            <span class="plan-badge ${planType}-badge">${planType.toUpperCase()}</span>
                            <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.9;">वैधता: ${expiry}</div>
                        `;
                    } else {
                        localStorage.setItem('db_plan', 'free');
                        displayElement.innerHTML = `<span>आपका प्लान: </span><span class="plan-badge free-badge">FREE</span>`;
                    }
                }
            });
        } else {
            // Login Nahi Hai
            if(loginSection) loginSection.style.display = 'block';
            if(menuSection) menuSection.style.display = 'none';
        }
    });
};

// --- Login Functions (OTP) ---
function sendOTP() {
    const name = document.getElementById('username').value.trim();
    let phone = document.getElementById('mobile').value.trim();

    if (!name || phone.length < 10) {
        alert("❌ कृपया सही नाम और 10 अंकों का मोबाइल नंबर डालें");
        return;
    }

    localStorage.setItem('kbc_user', name);
    phone = phone.replace(/\D/g, '').slice(-10); 
    const phoneNumber = "+91" + phone;

    auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
        .then((result) => {
            window.confirmationResult = result;
            alert("✅ OTP भेज दिया गया है!");
            document.getElementById('login-section').innerHTML = `
                <input type="number" id="otp-code" placeholder="6 अंकों का OTP डालें" style="padding:10px; width:80%; margin-bottom:10px;">
                <button onclick="verifyOTP()" class="start-btn">✅ वेरीफाई करें</button>
            `;
        }).catch((error) => {
            alert("❌ Error: " + error.message);
            window.location.reload();
        });
}

function verifyOTP() {
    const code = document.getElementById('otp-code').value.trim();
    window.confirmationResult.confirm(code).then(async (result) => {
        window.location.reload();
    }).catch(() => alert("❌ गलत OTP!"));
}

// --- Menu Functions (Game Logic Start) ---

function startPractice() {
    // Sirf Free questions load honge
    localStorage.setItem('selectedJson', 'free_questions.json'); 
    localStorage.setItem('forcePlan', 'free'); 
    window.location.href = "game.html";
}

function buyPlan(clickedPlan) {
    const dbPlan = localStorage.getItem('db_plan') || 'free';
    
    // Agar click kiya hua plan database wale active plan se match karta hai
    if (dbPlan === clickedPlan.toLowerCase()) {
        localStorage.setItem('selectedJson', clickedPlan.toLowerCase() + "_questions.json"); 
        localStorage.setItem('forcePlan', clickedPlan.toLowerCase()); 
        window.location.href = "game.html";
    } 
    else {
        // Payment Page par bhejein
        let amount = clickedPlan === 'silver' ? '49' : clickedPlan === 'gold' ? '99' : '199';
        if (confirm(`${clickedPlan.toUpperCase()} (₹${amount}) प्लान आपके पास नहीं है। क्या आप इसे खरीदना चाहते हैं?`)) {
            window.open("https://rzp.io/rzp/I5geGyLS", '_self');
        }
    }
}

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    auth.signOut().then(() => {
        window.location.replace("index.html");
    });
}
