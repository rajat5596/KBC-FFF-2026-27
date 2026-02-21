if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker Registered!', reg))
      .catch(err => console.log('Service Worker Failed', err));
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

// Recaptcha Verifier
window.onload = function() {
    // Recaptcha को तैयार करें
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
    
    // अगर आप चाहते हैं कि हर बार लॉगिन पेज आए (टेस्टिंग के लिए), 
    // तो नीचे की 4 लाइनों को अभी के लिए हटा (delete) दें:
    const savedUser = localStorage.getItem('kbc_user');
    if (savedUser) {
        showMenu(savedUser);
    }
};


// 1. OTP भेजने का फंक्शन
function sendOTP() {
    const name = document.getElementById('username').value;
    const phone = document.getElementById('mobile').value;

    if (!name || phone.length < 10) {
        alert("कृपया सही नाम और मोबाइल नंबर डालें");
        return;
    }

    const phoneNumber = "+91" + phone;
    const appVerifier = window.recaptchaVerifier;

    firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            alert("OTP भेज दिया गया है!");
            
            // UI बदलें - OTP बॉक्स दिखाएँ
            document.getElementById('login-section').innerHTML = `
                <input type="number" id="otp-code" placeholder="6 अंकों का OTP डालें">
                <button onclick="verifyOTP('${name}')" class="start-btn">वेरीफाई करें</button>
            `;
        }).catch((error) => {
            alert("Error: " + error.message);
            console.error(error);
        });
}

// 2. OTP वेरीफाई करने का फंक्शन
function verifyOTP(name) {
    const code = document.getElementById('otp-code').value;

    confirmationResult.confirm(code).then((result) => {
        // लॉगिन सफल
        localStorage.setItem('kbc_user', name);
        localStorage.setItem('kbc_phone', result.user.phoneNumber);
        showMenu(name);
    }).catch((error) => {
        alert("गलत OTP! कृपया दोबारा कोशिश करें।");
    });
}

// 3. मेनू दिखाने का फंक्शन
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    document.getElementById('welcome-msg').innerText = "स्वागत है, " + name;
}

function buySilver() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";
    alert("सिल्वर प्लान चुना गया! नाम: Rajat, मोबाइल: 9889904191 डालें");
    window.open(paymentLink, '_blank');
}

function buyGold() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";
    alert("गोल्ड प्लान चुना गया! नाम: Rajat, मोबाइल: 9889904191 डालें");
    window.open(paymentLink, '_blank');
}

function buyPlatinum() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";
    alert("प्लैटिनम प्लान चुना गया! नाम: Rajat, मोबाइल: 9889904191 डालें");
    window.open(paymentLink, '_blank');
}
function checkPremiumStatus(userData, mobileNumber) {
    if (!userData || !userData.expiry) return 'free';

    const today = new Date();
    const expiry = new Date(userData.expiry);

    if (today > expiry) {
        firebase.database().ref('users/' + mobileNumber).update({
            plan: 'free',
            status: 'expired'
        });
        alert("आपका प्रीमियम प्लान समाप्त हो गया है। कृपया रिचार्ज करें।");
        return 'free';
    }
    return userData.plan || 'free';
}
// पेमेंट के बाद ऑटो-अपडेट करने वाला लॉजिक
// window.addEventListener('load', () => { ... });  // Disabled - using Pipedream webhook only now
// Logout Function
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.reload();
    });
}

// --- 1. LOGOUT KO FAST BANANE KE LIYE ---
function logout() {
    // Pehle local storage aur session saaf karo taaki purana status turant hate
    localStorage.clear();
    sessionStorage.clear();

    firebase.auth().signOut().then(() => {
        console.log("Logged Out");
        // replace() se page reload karne par session puri tarah khatam ho jata hai
        window.location.replace("index.html");
    }).catch((error) => {
        console.error("Logout Error:", error);
        window.location.reload();
    });
}

// --- 2. PREMIUM STATUS AUR LOGIN CHECK ---
firebase.auth().onAuthStateChanged((user) => {
    const loginSection = document.getElementById('login-section');
    const menuSection = document.getElementById('menu-section');
    const planElement = document.getElementById('plan-status');
    const welcomeMsg = document.getElementById('welcome-msg');

    if (user) {
        if(loginSection) loginSection.style.display = 'none';
        if(menuSection) menuSection.style.display = 'block';

        // Phone number se +91 hatayein taaki database se match ho sake
        const phone = user.phoneNumber.replace("+91", "").replace("+", "");
        console.log("Fetching data for:", phone);
        
        // Database se data real-time mangwayein
        firebase.database().ref('users/' + phone).on('value', (snapshot) => {
            const data = snapshot.val();
            const name = localStorage.getItem('username') || "यूजर";
            
            if(welcomeMsg) welcomeMsg.innerText = "नमस्ते, " + name;

            if (data && data.plan) {
                // Trim() extra space ko hata dega agar database mein galti se space ho
                let currentPlan = data.plan.trim().toUpperCase();
                let expiryText = "";
                
                // Expiry date dikhane ke liye
                if (data.expiry) {
                    const dateObj = new Date(data.expiry);
                    expiryText = " (वैधता: " + dateObj.toLocaleDateString('hi-IN') + ")";
                }

                if(planElement) {
                    planElement.innerText = "आपका प्लान: " + currentPlan + expiryText;
                    planElement.style.color = "#00ff00"; // Green color
                    planElement.style.display = "block";
                }
            } else {
                // Agar koi plan database mein nahi hai
                if(planElement) {
                    planElement.innerText = "आपका प्लान: FREE (मुफ्त)";
                    planElement.style.color = "#ffcc00"; // Yellow color
                    planElement.style.display = "block";
                }
            }
        }, (error) => {
            console.error("Database Error:", error);
        });
    } else {
        if(loginSection) loginSection.style.display = 'block';
        if(menuSection) menuSection.style.display = 'none';
    }
});
