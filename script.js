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

// Google Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Global Variables - OTP wale variables hat gaye
// let confirmationResult; ← ISE HATANA HAI

// Initialize Google Sign-In
window.onload = function() {
    // Google Sign-In button render karo
    google.accounts.id.initialize({
        client_id: "294360741451-XXXXXXXXXXXX.apps.googleusercontent.com", // ← YEH BADALNA HAI
        callback: handleGoogleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", text: "continue_with" }
    );
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ User Active:", user.email);
            const name = localStorage.getItem('kbc_user') || user.displayName || "यूजर";
            showMenu(name);
            await loadUserPlan(user);
        }
    });
};

// 🔥 GOOGLE SIGN-IN HANDLER (OTP ki jagah)
function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;
    
    // Google credential se Firebase sign-in
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    
    auth.signInWithCredential(credential)
        .then(async (result) => {
            const user = result.user;
            const email = user.email;
            const displayName = user.displayName;
            
            // LocalStorage mein save karo
            const userName = document.getElementById('username').value.trim() || displayName;
            localStorage.setItem('kbc_user', userName);
            localStorage.setItem('kbc_email', email);
            localStorage.setItem('kbc_uid', user.uid);
            
            // --- DATABASE MEIN SAVE KARO (phone ki jagah email/uid use karo) ---
            await database.ref('users/' + user.uid).update({
                name: userName,
                email: email,
                plan: 'free',
                status: 'active',
                loginMethod: 'google',
                expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }).then(() => {
                console.log("✅ Data successfully saved in DB for user:", user.uid);
            });
            
            const name = localStorage.getItem('kbc_user') || userName;
            showMenu(name);
            await loadUserPlan(user);
        })
        .catch((error) => {
            console.error("Google Sign-In Error:", error);
            alert("❌ Google Sign-In failed: " + error.message);
        });
}

// 3. मेनू दिखाने का फंक्शन (SAME)
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;
}

// User Plan Load करने का फंक्शन (phone ki jagah uid use karega)
async function loadUserPlan(user) {
    if (!user) return;
    
    const userId = user.uid; // Phone ki jagah UID use karo
    
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
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
                
                localStorage.setItem('user_plan_status', 'premium');
                localStorage.setItem('user_plan_type', plan);
                localStorage.setItem('user_id', userId);

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
                handleExpiredPlan(userId, planDisplay);
            }
        } else {
            localStorage.setItem('user_plan_status', 'free');
            localStorage.removeItem('user_plan_type');
            planDisplay.style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
            planDisplay.innerHTML = `🎯 फ्री प्लान (10 सवाल उपलब्ध)`;
        }

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

// लिमिट खत्म होने पर (SAME)
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

// Buy Plan फंक्शन (SAME)
function buyPlan(clickedPlan) {
    const userPlanStatus = localStorage.getItem('user_plan_status');
    const userActivePlan = localStorage.getItem('user_plan_type');
    
    console.log("🔍 Buy Plan Clicked:", clickedPlan);
    console.log("👤 User Status:", userPlanStatus, "Active Plan:", userActivePlan);
    
    if (userPlanStatus === 'premium' && userActivePlan) {
        if (userActivePlan === clickedPlan) {
            console.log("✅ Same plan - starting game");
            window.location.href = "game.html";
            return;
        } else {
            const confirmMsg = `आपके पास पहले से ${userActivePlan.toUpperCase()} प्लान एक्टिव है।\n${clickedPlan.toUpperCase()} प्लान पर स्विच करें?`;
            if (confirm(confirmMsg)) {
                window.location.href = "https://rzp.io/rzp/I5geGyLS";
            }
            return;
        }
    } else {
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

// Logout (SAME)
function logout() {
    localStorage.clear();
    auth.signOut().then(() => {
        window.location.replace("index.html");
    });
}

// Expired Plan Handler (userId parameter ke saath)
function handleExpiredPlan(userId, planDisplay) {
    localStorage.setItem('user_plan_status', 'expired');
    planDisplay.style.background = "linear-gradient(135deg, #f44336, #c62828)";
    planDisplay.innerHTML = `⚠️ प्लान एक्सपायर हो गया है। कृपया नया प्लान लें।`;
    
    database.ref('users/' + userId).update({
        status: 'expired'
    }).catch(() => {});
}

// प्रैक्टिस शुरू करें फंक्शन (SAME)
function startPractice() {
    const userPlanStatus = localStorage.getItem('user_plan_status');
    const userActivePlan = localStorage.getItem('user_plan_type');
    
    console.log("Starting practice - Plan status:", userPlanStatus, "Active plan:", userActivePlan);
    
    if (userPlanStatus === 'premium' && userActivePlan) {
        window.location.href = "game.html";
    } else {
        window.location.href = "game.html";
    }
}

// डिबग फंक्शन (Updated)
function checkLocalStorage() {
    console.log("🔍 LocalStorage Check:");
    console.log("user_plan_status:", localStorage.getItem('user_plan_status'));
    console.log("user_plan_type:", localStorage.getItem('user_plan_type'));
    console.log("kbc_email:", localStorage.getItem('kbc_email'));
    console.log("user_id:", localStorage.getItem('user_id'));
}

// Guest Login (SAME)
window.loginAsGuest = function() {
    console.log("Guest button clicked!");
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('user_plan_type', 'free');
    localStorage.setItem('user_plan_status', 'active');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    document.getElementById('welcome-msg').innerText = "स्वागत है, Guest User!";
    document.getElementById('user-plan-display').innerHTML = `
        <span style="color: #00ff00;">FREE एक्टिव</span><br>
        Guest Mode - सभी फ्री फीचर्स उपलब्ध
    `;
    document.querySelector('.logout-btn').innerText = "Exit Guest Mode";
    document.querySelector('.logout-btn').onclick = function() {
        localStorage.clear();
        location.reload();
    };
    alert("Guest Mode चालू! Home screen पर ही रहेंगे...");
};
