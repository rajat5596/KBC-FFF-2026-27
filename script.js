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
    if (code.length !== 6) { alert("❌ कृपया 6 अंकों का OTP डालें"); return; }

    window.confirmationResult.confirm(code).then(async (result) => {
        const user = result.user;
        const phone = user.phoneNumber.replace(/\D/g, '').slice(-10); // Mobile number nikaala
        localStorage.setItem('kbc_phone', phone);
        
        // --- YAHAN DATA SAVE HOGA ---
        // Phone number ke path par data save/update karein
        await database.ref('users/' + phone).update({
            name: localStorage.getItem('kbc_user'),
            plan: 'free', // Naye user ke liye default
            status: 'active',
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 din ki validity
        }).then(() => {
            console.log("✅ Data successfully saved in DB for phone: " + phone);
        });

        const name = localStorage.getItem('kbc_user') || "यूजर";
        showMenu(name);
        await loadUserPlan(user);
    }).catch((error) => {
        alert("❌ गलत OTP!");
        console.error("OTP Error:", error);
    });
}


// 3. मेनू दिखाने का फंक्शन
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;
}

// User Plan Load करने के फंक्शन में यह जोड़ो
async function loadUserPlan(user) {
    if (!user) return;
    
    const phone = user.phoneNumber.replace(/\D/g, '').slice(-10);
    
    try {
        const snapshot = await database.ref('users/' + phone).once('value');
        const userData = snapshot.val();
        const planDisplay = document.getElementById('user-plan-display');
        
        if (!planDisplay) return;

        // पहले सभी plan buttons से active class हटाओ
        document.querySelectorAll('.plan-btn').forEach(btn => {
            btn.classList.remove('active-plan');
        });

        if (userData && userData.plan && userData.status === 'active') {
            const expiryDate = new Date(userData.expiry);
            const today = new Date();
            
            if (expiryDate > today) {
                const plan = userData.plan.toLowerCase();
                const expiryStr = expiryDate.toLocaleDateString('hi-IN');
                
                // localStorage में सेव करें
                localStorage.setItem('user_plan_status', 'premium');
                localStorage.setItem('user_plan_type', plan);

                // Active plan button को highlight करो
                const activeBtn = document.getElementById(`${plan}-plan-btn`);
                if (activeBtn) {
                    activeBtn.classList.add('active-plan');
                }

                let planConfig = { icon: "🎯", color: "#667eea" };
                if (plan === 'silver') planConfig = { icon: "🥈", color: "linear-gradient(135deg, #C0C0C0, #707070)" };
                if (plan === 'gold') planConfig = { icon: "🥇", color: "linear-gradient(135deg, #FFD700, #B8860B)" };
                if (plan === 'platinum') planConfig = { icon: "💎", color: "linear-gradient(135deg, #E5E4E2, #708090)" };

                planDisplay.style.background = planConfig.color;
                planDisplay.innerHTML = `
                    <div style="padding:10px;">
                        ${planConfig.icon} <b>${plan.toUpperCase()} एक्टिव</b><br>
                        <small>वैधता: ${expiryStr}</small>
                    </div>`;
            } else {
                handleExpiredPlan(phone, planDisplay);
            }
        } else {
            // Free प्लान
            localStorage.setItem('user_plan_status', 'free');
            localStorage.removeItem('user_plan_type');
            planDisplay.style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
            planDisplay.innerHTML = `🎯 फ्री प्लान (10 सवाल उपलब्ध)`;
        }

        // Fallback display
        if (planDisplay && !planDisplay.innerHTML.trim()) {
            planDisplay.innerHTML = "🎯 फ्री प्लान (10 सवाल उपलब्ध)";
            planDisplay.style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
        }
    } catch (error) {
        console.error("Plan Load Error:", error);
        const planDisplay = document.getElementById('user-plan-display');
        if (planDisplay) {
            planDisplay.innerHTML = "🎯 फ्री प्लान (10 सवाल उपलब्ध)";
            planDisplay.style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
        }
    }
}

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

// Buy Plan फंक्शन - Active Plan के हिसाब से काम करेगा
function buyPlan(clickedPlan) {
    // localStorage से यूजर का स्टेटस और प्लान लोड करो
    const userPlanStatus = localStorage.getItem('user_plan_status');
    const userActivePlan = localStorage.getItem('user_plan_type');
    
    console.log("🔍 Buy Plan Clicked:", clickedPlan);
    console.log("👤 User Status:", userPlanStatus, "Active Plan:", userActivePlan);
    
    // केस 1: यूजर के पास कोई एक्टिव प्रीमियम प्लान है
    if (userPlanStatus === 'premium' && userActivePlan) {
        
        // अगर वही प्लान क्लिक किया जो एक्टिव है
        if (userActivePlan === clickedPlan) {
            console.log("✅ Same plan - starting game");
            window.location.href = "game.html";
            return;
        }
        
        // अगर दूसरा प्लान क्लिक किया (अपग्रेड/डाउनग्रेड)
        else {
            const confirmMsg = `आपके पास पहले से ${userActivePlan.toUpperCase()} प्लान एक्टिव है।\n${clickedPlan.toUpperCase()} प्लान पर स्विच करें?`;
            if (confirm(confirmMsg)) {
                window.location.href = "https://rzp.io/rzp/I5geGyLS";
            }
            return;
        }
    }
    
    // केस 2: फ्री यूजर - सीधा पेमेंट पेज
    else {
        let confirmMsg = '';
        if (clickedPlan === 'silver') {
            confirmMsg = '🥈 सिल्वर प्लान (₹49) लें?\n500 सवाल अनलिमिटेड प्रैक्टिस';
        } else if (clickedPlan === 'gold') {
            confirmMsg = '🥇 गोल्ड प्लान (₹99) लें?\n1500 सवाल अनलिमिटेड प्रैक्टिस';
        } else if (clickedPlan === 'platinum') {
            confirmMsg = '💎 प्लैटिनम प्लान (₹199) लें?\nअनलिमिटेड सवाल';
        }

        if (confirm(confirmMsg)) {
            window.location.href = "https://rzp.io/rzp/I5geGyLS";
        }
    }
}

// Logout
function logout() {
    localStorage.clear();
    auth.signOut().then(() => {
        window.location.replace("index.html");
    });
}

// Expired Plan Handler
function handleExpiredPlan(phone, planDisplay) {
    localStorage.setItem('user_plan_status', 'expired');
    planDisplay.style.background = "linear-gradient(135deg, #f44336, #c62828)";
    planDisplay.innerHTML = `⚠️ प्लान एक्सपायर हो गया है। कृपया नया प्लान लें।`;
    
    // Update Firebase
    database.ref('users/' + phone).update({
        status: 'expired'
    }).catch(() => {});
            }
// प्रैक्टिस शुरू करें फंक्शन
function startPractice() {
    const userPlanStatus = localStorage.getItem('user_plan_status');
    const userActivePlan = localStorage.getItem('user_plan_type');
    
    console.log("Starting practice - Plan status:", userPlanStatus, "Active plan:", userActivePlan);
    
    // अगर premium user है
    if (userPlanStatus === 'premium' && userActivePlan) {
        // सीधा game.html खोलो
        window.location.href = "game.html";
    } else {
        // Free user - 10 सवाल वाला game.html खोलो
        window.location.href = "game.html";
    }
}
// डिबग फंक्शन - कंसोल में चलाना
function checkLocalStorage() {
    console.log("🔍 LocalStorage Check:");
    console.log("user_plan_status:", localStorage.getItem('user_plan_status'));
    console.log("user_plan_type:", localStorage.getItem('user_plan_type'));
    console.log("kbc_phone:", localStorage.getItem('kbc_phone'));
}
// Function ko 'window' object ke sath jodein taaki HTML ise pehchan sake
window.loginAsGuest = function() {
    signInAnonymously(auth)
        .then(() => {
            console.log("Guest User Entry Successful");

            // गेस्ट यूजर को होम पर ही रखो (index.html), quiz_mode पर मत भेजो
            localStorage.setItem('isGuest', 'true');  // ऑप्शनल: गेस्ट फ्लैग सेट करो
            alert("Guest Mode Activated! Home page पर जा रहे हैं...");

            // होम पर रीडायरेक्ट (या अगर पहले से होम पर है तो रिफ्रेश)
            window.location.href = "index.html";  // या "./" या window.location.origin + "/"
            // अगर होम पर ही रहना है तो ये भी काम करेगा:
            // location.reload();  // पेज रिफ्रेश करके गेस्ट मोड अपडेट कर देगा
        })
        .catch((error) => {
            console.error("Auth Error Code:", error.code);
            alert("Error: " + error.message);
        });
};
