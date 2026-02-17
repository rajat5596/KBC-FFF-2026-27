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

function buyPlan(amt) {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS";
    
    // यूजर को निर्देश दें कि उसे पेज पर क्या करना है
    alert("आपने " + amt + " वाला प्लान चुना है। अगले पेज पर अपने प्लान के सामने '+' दबाकर उसे सेलेक्ट करें।");
    
    window.open(paymentLink, '_blank');
}
function checkPremiumStatus(userData, mobileNumber) {
    const today = new Date();
    const expiry = new Date(userData.expiryDate);

    // अगर आज की तारीख एक्सपायरी से बड़ी है
    if (today > expiry) {
        // प्रीमियम खत्म! डेटाबेस अपडेट करें
        firebase.database().ref('users/' + mobileNumber).update({
            isPremium: false,
            plan: 'free'
        });
        
        alert("आपका प्रीमियम प्लान समाप्त हो गया है। कृपया प्रैक्टिस जारी रखने के लिए रिचार्ज करें।");
        return 'free';
    }
    
    return userData.plan;
}
// पेमेंट के बाद ऑटो-अपडेट करने वाला लॉजिक
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const payId = urlParams.get('razorpay_payment_id');
    const amount = urlParams.get('payment_amount'); // Razorpay अमाउंट भेजता है

    if (payId) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                let selectedPlan = 'free';
                
                // राशि के आधार पर प्लान का नाम तय करें
                // ₹49 = 4900, ₹99 = 9900, ₹199 = 19900
                if (amount == "4900" || amount == "49") selectedPlan = 'silver';
                else if (amount == "9900" || amount == "99") selectedPlan = 'gold';
                else if (amount == "19900" || amount == "199") selectedPlan = 'platinum';

                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30); // 30 दिन का समय

                firebase.database().ref('users/' + user.phoneNumber).update({
                    plan: selectedPlan,
                    expiry: expiry.toISOString(),
                    last_payment_id: payId
                }).then(() => {
                    alert("बधाई हो! आपका " + selectedPlan.toUpperCase() + " प्लान एक्टिवेट हो गया है।");
                    // लिंक साफ करने के लिए ताकि बार-बार अलर्ट न आए
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
            }
        });
    }
});
