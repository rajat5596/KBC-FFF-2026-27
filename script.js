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
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });
    
    // चेक करें कि यूजर पहले से लॉगिन है या नहीं
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

// प्रीमियम प्लान पर क्लिक (Razorpay लिंक यहाँ जोड़ें)
function buyPlan(amt) {
    alert("₹" + amt + " के भुगतान के लिए Razorpay पर भेजा जा रहा है...");
    // window.location.href = "YOUR_RAZORPAY_LINK";
}
