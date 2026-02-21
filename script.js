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

// User login state check karna
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('menu-section').style.display = 'block';

        // 1. Phone number clean karein
        const phone = user.phoneNumber.replace("+91", "").replace("+", "");
        
        // 2. Database se plan aur naam check karein
        firebase.database().ref('users/' + phone).on('value', (snapshot) => {
            const data = snapshot.val();
            const name = localStorage.getItem('username') || "यूजर";
            
            document.getElementById('welcome-msg').innerText = "नमस्ते, " + name;

            if (data && data.plan) {
                // Agar plan mil gaya (silver, gold, platinum)
                document.getElementById('plan-status').innerText = "आपका प्लान: " + data.plan.toUpperCase();
                document.getElementById('plan-status').style.color = "#00ff00"; // Green color
            } else {
                // Agar koi plan nahi hai
                document.getElementById('plan-status').innerText = "आपका प्लान: FREE (मुफ्त)";
                document.getElementById('plan-status').style.color = "#ffcc00"; // Yellow color
            }
        });
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('menu-section').style.display = 'none';
    }
});
