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

// 4. User Plan Load करने का फंक्शन
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Login hone par sections badalna
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('menu-section').style.display = 'block';

        // 1. Phone number ko clean karein (chahe wo +91 se aaye ya 10 digit se)
        // Hum sirf aakhri ke 10 digits nikaal rahe hain
        const fullPhone = user.phoneNumber || ""; 
        const tenDigitPhone = fullPhone.slice(-10); 
        
        console.log("Searching Database for:", tenDigitPhone);
        
        const displayElement = document.getElementById('user-plan-display');

        // 2. Database mein sirf 10 digit waale number folder ko check karein
        firebase.database().ref('users/' + tenDigitPhone).on('value', (snapshot) => {
            const data = snapshot.val();
            
            if (data && data.plan) {
                let planType = data.plan.trim().toLowerCase();
                let expiry = data.expiry ? new Date(data.expiry).toLocaleDateString('hi-IN') : "N/A";

                // UI update (Aapke naye index.html design ke hisaab se)
                if(displayElement) {
                    displayElement.innerHTML = `
                        <span>आपका प्लान: </span>
                        <span class="plan-badge ${planType}-badge">${planType.toUpperCase()}</span>
                        <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.9;">वैधता: ${expiry}</div>
                    `;
                }
            } else {
                // Agar plan nahi mila
                if(displayElement) {
                    displayElement.innerHTML = `<span>आपका प्लान: </span><span class="plan-badge free-badge">FREE</span>`;
                }
            }
        }, (error) => {
            console.error("Database Read Error:", error);
        });
    }
});


// लिमिट खत्म होने पर
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";

    const userConfirmed = confirm("10 मुफ्त सवाल पूरे हो गए!\nप्रीमियम प्लान लें?");

    if (userConfirmed) {
        setTimeout(() => {
            window.open(paymentLink, '_self');
        }, 500);
    } else {
        window.location.href = "index.html";
    }
}

// Buy Plan फंक्शन
function buyPlan(plan) {
    let planName = plan.toUpperCase();
    let amount = plan === 'silver' ? '49' : plan === 'gold' ? '99' : '199';
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";

    if (confirm(`\( {planName} प्लान (₹ \){amount}) चुन लिया!\nपेमेंट पेज पर जाएँ?`)) {
        window.open(paymentLink, '_self');
    } else {
        alert("प्लान चुनने से कैंसल किया गया।");
    }
}

// Logout
function logout() {
    localStorage.clear();
    auth.signOut().then(() => {
        window.location.replace("index.html");
    });
}
