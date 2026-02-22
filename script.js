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
firebase.initializeApp(firebaseConfig);

// Global Variables
let confirmationResult;
let currentUser = null;

// Recaptcha Verifier
window.onload = function() {
    // Recaptcha को तैयार करें
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ User already logged in:", user.phoneNumber);
            currentUser = user;
            
            // Get user data from localStorage
            const name = localStorage.getItem('kbc_user') || "यूजर";
            
            // Show menu
            showMenu(name);
            
            // Load user plan
            await loadUserPlan(user);
        }
    });
};

// 1. OTP भेजने का फंक्शन
function sendOTP() {
    const name = document.getElementById('username').value.trim();
    const phone = document.getElementById('mobile').value.trim();

    if (!name || phone.length < 10) {
        alert("❌ कृपया सही नाम और मोबाइल नंबर डालें");
        return;
    }

    // Save name in localStorage
    localStorage.setItem('kbc_user', name);

    const phoneNumber = "+91" + phone;
    const appVerifier = window.recaptchaVerifier;

    firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            alert("✅ OTP भेज दिया गया है! अपना मोबाइल चेक करें।");
            
            // UI बदलें - OTP बॉक्स दिखाएँ
            document.getElementById('login-section').innerHTML = `
                <input type="number" id="otp-code" placeholder="6 अंकों का OTP डालें">
                <button onclick="verifyOTP()" class="start-btn">✅ वेरीफाई करें</button>
            `;
        }).catch((error) => {
            alert("❌ Error: " + error.message);
            console.error(error);
        });
}

// 2. OTP वेरीफाई करने का फंक्शन
function verifyOTP() {
    const code = document.getElementById('otp-code').value.trim();

    if (!code || code.length !== 6) {
        alert("❌ कृपया 6 अंकों का OTP डालें");
        return;
    }

    window.confirmationResult.confirm(code).then(async (result) => {
        // लॉगिन सफल
        const user = result.user;
        currentUser = user;
        
        console.log("✅ Login successful:", user.phoneNumber);
        
        // Save phone in localStorage
        localStorage.setItem('kbc_phone', user.phoneNumber);
        
        // Get name from localStorage
        const name = localStorage.getItem('kbc_user') || "यूजर";
        
        // Show menu
        showMenu(name);
        
        // Load user plan
        await loadUserPlan(user);
        
    }).catch((error) => {
        alert("❌ गलत OTP! कृपया दोबारा कोशिश करें।");
        console.error(error);
    });
}

// 3. मेनू दिखाने का फंक्शन
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) {
        welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;
    }
}

// 4. User Plan Load करने का फंक्शन
async function loadUserPlan(user) {
    if (!user) return;
    
    // Get phone number (remove +91)
    const phoneNumber = user.phoneNumber.replace("+91", "");
    
    try {
        console.log("📱 Loading plan for:", phoneNumber);
        
        // Get data from Firebase
        const snapshot = await firebase.database().ref('users/' + phoneNumber).once('value');
        const userData = snapshot.val();
        
        console.log("📦 Firebase data:", userData);
        
        // Get plan display element
        const planDisplay = document.getElementById('user-plan-display');
        
        if (!planDisplay) {
            console.error("❌ user-plan-display element not found in HTML");
            return;
        }
        
        if (userData && userData.plan && userData.status === 'active') {
            // Check expiry
            const expiryDate = new Date(userData.expiry);
            const today = new Date();
            
            if (expiryDate > today) {
                // Active plan
                const plan = userData.plan.toLowerCase();
                const expiryStr = expiryDate.toLocaleDateString('hi-IN');
                
                // Set display based on plan
                let planIcon = "🎯";
                let planColor = "";
                
                if (plan === 'silver') {
                    planIcon = "🥈";
                    planColor = "linear-gradient(135deg, #C0C0C0 0%, #808080 100%)";
                } else if (plan === 'gold') {
                    planIcon = "🥇";
                    planColor = "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
                } else if (plan === 'platinum') {
                    planIcon = "💎";
                    planColor = "linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%)";
                }
                
                planDisplay.style.background = planColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                planDisplay.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <span style="font-size: 1.5rem;">${planIcon}</span>
                        <span style="font-weight: bold;">${plan.toUpperCase()} प्लान</span>
                        <span style="font-size: 0.9rem; opacity: 0.9;">(exp: ${expiryStr})</span>
                    </div>
                `;
                
                console.log(`✅ Premium user: ${plan}`);
            } else {
                // Expired plan
                planDisplay.style.background = "#f44336";
                planDisplay.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <span>⚠️</span>
                        <span>आपका प्लान एक्सपायर हो गया है</span>
                    </div>
                `;
                
                console.log("⚠️ Plan expired");
                
                // Update Firebase status
                await firebase.database().ref('users/' + phoneNumber).update({
                    status: 'expired'
                });
            }
        } else {
            // Free user
            planDisplay.style.background = "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)";
            planDisplay.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <span>🎯</span>
                    <span>फ्री प्लान (10 सवाल मुफ्त)</span>
                </div>
            `;
            
            console.log("ℹ️ Free user");
        }
    } catch (error) {
        console.error("❌ Error loading plan:", error);
    }
}

// 5. Buy Plan Function (एक ही फंक्शन सबके लिए)
function buyPlan(plan) {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        alert("❌ पहले लॉगिन करें!");
        return;
    }
    
    const phone = user.phoneNumber.replace("+91", "");
    const name = localStorage.getItem('kbc_user') || "User";
    
    // Plan prices
    const prices = {
        'silver': 49,
        'gold': 99,
        'platinum': 199
    };
    
    const price = prices[plan] || 49;
    
    // Payment page URL (aapka Razorpay link)
    const paymentLink = "https://rzp.io/rzp/15geGvLS_conv";
    
    // Show payment instructions
    alert(`✅ ${plan.toUpperCase()} प्लान चुना गया!\n\nकृपया इन डिटेल्स से पेमेंट करें:\n📱 फोन: ${phone}\n💰 रकम: ₹${price}\n\nपेमेंट के बाद ऑटोमेटिक एक्टिव हो जाएगा।`);
    
    // Open payment page
    window.open(paymentLink, '_blank');
}

// 6. Logout Function
function logout() {
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();

    firebase.auth().signOut().then(() => {
        console.log("✅ Logged Out");
        
        // Show login section
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('menu-section').style.display = 'none';
        
        // Reset login form
        document.getElementById('login-section').innerHTML = `
            <input type="text" id="username" placeholder="अपना नाम लिखें" required>
            <input type="number" id="mobile" placeholder="मोबाइल नंबर" required>
            <div id="recaptcha-container"></div>
            <button id="auth-btn" onclick="sendOTP()" class="start-btn">OTP भेजें</button>
        `;
        
        // Reinitialize recaptcha
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
        
        window.location.replace("index.html");
        
    }).catch((error) => {
        console.error("❌ Logout Error:", error);
        window.location.reload();
    });
}
