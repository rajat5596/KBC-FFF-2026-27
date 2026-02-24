if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker Registered!', reg))
            .catch(err => console.log('❌ Service Worker Failed', err));
    });
}

// Firebase Config (Fatehpur Hubs प्रोजेक्ट)
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

// Global Variables
let confirmationResult;

// Recaptcha Verifier
window.onload = function() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
    }
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ User Active:", user.phoneNumber);
            const name = localStorage.getItem('kbc_user') || "यूजर";
            showMenu(name);
            await loadUserPlan(user);
        }
    });
};

// 1. OTP भेजने का फंक्शन
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
            console.error(error);
            window.location.reload();
        });
}

// 2. OTP वेरीफाई करने का फंक्शन
function verifyOTP() {
    const code = document.getElementById('otp-code').value.trim();

    if (code.length !== 6) {
        alert("❌ कृपया 6 अंकों का OTP डालें");
        return;
    }

    window.confirmationResult.confirm(code).then(async (result) => {
        const user = result.user;
        const phone = user.phoneNumber.replace(/\D/g, '').slice(-10);
        localStorage.setItem('kbc_phone', phone);
        
        const name = localStorage.getItem('kbc_user') || "यूजर";
        showMenu(name);
        await loadUserPlan(user);
    }).catch((error) => {
        alert("❌ गलत OTP!");
    });
}

// 3. मेनू दिखाने का फंक्शन
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;
}

// Firebase Auth State
firebase.auth().onAuthStateChanged((user) => {
    const loginSection = document.getElementById('login-section');
    const menuSection = document.getElementById('menu-section');
    const displayElement = document.getElementById('user-plan-display');

    if (user) {
        if(loginSection) loginSection.style.display = 'none';
        if(menuSection) menuSection.style.display = 'block';

        // 10 digit number extraction
        const fullPhone = user.phoneNumber || ""; 
        const tenDigitPhone = fullPhone.slice(-10); 
        
        // Database connection
        firebase.database().ref('users/' + tenDigitPhone).on('value', (snapshot) => {
            const data = snapshot.val();
            
            if (displayElement) {
                displayElement.style.display = "block"; // Pehle hi show kar do
                
                if (data && data.plan) {
                    let planType = data.plan.trim().toLowerCase();
                    let expiry = data.expiry ? new Date(data.expiry).toLocaleDateString('hi-IN') : "N/A";

                    displayElement.innerHTML = `
                        <span>आपका प्लान: </span>
                        <span class="plan-badge ${planType}-badge">${planType.toUpperCase()}</span>
                        <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.9;">वैधता: ${expiry}</div>
                    `;
                } else {
                    displayElement.innerHTML = `<span>आपका प्लान: </span><span class="plan-badge free-badge">FREE</span>`;
                }
            }
        });
    } else {
        if(loginSection) loginSection.style.display = 'block';
        if(menuSection) menuSection.style.display = 'none';
    }
});

// Logout (Sirf ek baar rakhein)
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    firebase.auth().signOut().then(() => {
        window.location.replace("index.html");
    });
}

function buyPlan(clickedPlan) {
    const displayElement = document.getElementById('user-plan-display');
    const activePlan = displayElement ? displayElement.innerText.toUpperCase() : "FREE";

    // Agar wahi plan click kiya jo active hai
    if (activePlan.includes(clickedPlan.toUpperCase())) {
        localStorage.setItem('selectedJson', clickedPlan.toLowerCase() + "_questions.json"); 
        window.location.href = "game.html";
    } 
    else {
        // Agar dusra plan click kiya toh payment page
        let amount = clickedPlan === 'silver' ? '49' : clickedPlan === 'gold' ? '99' : '199';
        const paymentLink = "https://rzp.io/rzp/I5geGyLS";
        if (confirm(`${clickedPlan.toUpperCase()} (₹${amount}) प्लान लें?`)) {
            window.open(paymentLink, '_self');
        }
    }
}

// Practice button ke liye (Taki free sawal hi load hon)
function startPractice() {
    localStorage.setItem('selectedJson', 'free_questions.json'); // Naam ekdum sahi hona chahiye
    window.location.href = "game.html";
}




// 1. Game Start logic - Jo Premium check karega
function startPractice() {
    const display = document.getElementById('user-plan-display');
    const planText = display ? display.innerText.toUpperCase() : "FREE";

    if (planText.includes("SILVER") || planText.includes("GOLD") || planText.includes("PLATINUM")) {
        console.log("Premium User Detected: " + planText);
        // Premium user ke liye game.html par bhejein (yahan koi 10 limit nahi lagegi)
        window.location.href = "game.html"; 
    } else {
        // Free user ke liye purana limit wala check
        checkFreeLimitAndStart();
    }
}

// 2. Limit Check Fix - Jo Silver users ko kabhi nahi rokega
function checkFreeLimitAndStart() {
    let playedCount = localStorage.getItem('playedCount') || 0;
    
    if (playedCount >= 10) {
        // Sirf tabhi limit wala pop-up dikhaye jab user FREE ho
        handleLimitReached();
    } else {
        window.location.href = "game.html";
    }
                                           }
