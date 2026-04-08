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

// Initialize everything when page loads
window.onload = function() {
    console.log("Page loaded, initializing...");
    
    // ✅ Google Sign-In Button Initialize Karein ✅
    // IMPORTANT: Apni REAL Google Client ID yahan daalein
    // Yeh client ID temporary hai, aapko apni banani padegi
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: "294360741451-5a4a6ac0838f8542fabfce.apps.googleusercontent.com", // ← YEH BADAL SAKTA HAI
            callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", text: "continue_with", width: "250" }
        );
        console.log("✅ Google Sign-In button rendered");
    } else {
        console.error("❌ Google Identity Services not loaded!");
        // Fallback: Manual Google button
        const googleBtnDiv = document.getElementById("google-signin-btn");
        if (googleBtnDiv) {
            googleBtnDiv.innerHTML = '<button onclick="manualGoogleSignIn()" style="padding:12px 30px; background:#4285F4; color:white; border:none; border-radius:8px; font-size:16px; cursor:pointer;">🔐 Google Sign In</button>';
        }
    }
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ User Active:", user.email);
            const name = localStorage.getItem('kbc_user') || user.displayName || "यूजर";
            showMenu(name);
            await loadUserPlan(user);
        }
    });
};

// 🔥 GOOGLE SIGN-IN HANDLER (Main)
function handleGoogleCredentialResponse(response) {
    console.log("Google credential received");
    const idToken = response.credential;
    
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    
    auth.signInWithCredential(credential)
        .then(async (result) => {
            const user = result.user;
            const email = user.email;
            const displayName = user.displayName;
            
            const userName = document.getElementById('username').value.trim() || displayName || email.split('@')[0];
            localStorage.setItem('kbc_user', userName);
            localStorage.setItem('kbc_email', email);
            localStorage.setItem('kbc_uid', user.uid);
            
            // Database mein save karo
            await database.ref('users/' + user.uid).update({
                name: userName,
                email: email,
                plan: 'free',
                status: 'active',
                loginMethod: 'google',
                createdAt: new Date().toISOString(),
                expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }).then(() => {
                console.log("✅ Data saved for user:", user.uid);
            });
            
            showMenu(userName);
            await loadUserPlan(user);
        })
        .catch((error) => {
            console.error("Google Sign-In Error:", error);
            alert("❌ Google Sign-In failed: " + error.message);
        });
}

// 🔥 Manual Google Sign-In (Fallback agar automatic button kaam na kare)
window.manualGoogleSignIn = function() {
    console.log("Manual Google Sign-In triggered");
    
    auth.signInWithPopup(googleProvider)
        .then(async (result) => {
            const user = result.user;
            const email = user.email;
            const displayName = user.displayName;
            
            const userName = document.getElementById('username').value.trim() || displayName || email.split('@')[0];
            localStorage.setItem('kbc_user', userName);
            localStorage.setItem('kbc_email', email);
            localStorage.setItem('kbc_uid', user.uid);
            
            await database.ref('users/' + user.uid).update({
                name: userName,
                email: email,
                plan: 'free',
                status: 'active',
                loginMethod: 'google',
                createdAt: new Date().toISOString(),
                expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            showMenu(userName);
            await loadUserPlan(user);
        })
        .catch((error) => {
            console.error("Popup Sign-In Error:", error);
            alert("❌ Sign-In Failed: " + error.message);
        });
};

// 3. मेनू दिखाने का फंक्शन
function showMenu(name) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) welcomeMsg.innerHTML = `👋 स्वागत है, <strong>${name}</strong>!`;
}

// User Plan Load करने का फंक्शन
async function loadUserPlan(user) {
    if (!user) return;
    
    const userId = user.uid;
    
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
            planDisplay.innerHTML = `🎯 फ्री प्लान (10 सवाल उपलब्ध) <span class="plan-badge free-badge">फ्री</span>`;
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

// Logout
function logout() {
    localStorage.clear();
    auth.signOut().then(() => {
        window.location.replace("index.html");
    });
}

// Expired Plan Handler
function handleExpiredPlan(userId, planDisplay) {
    localStorage.setItem('user_plan_status', 'expired');
    planDisplay.style.background = "linear-gradient(135deg, #f44336, #c62828)";
    planDisplay.innerHTML = `⚠️ प्लान एक्सपायर हो गया है। कृपया नया प्लान लें। <span class="plan-badge expired-badge">एक्सपायर्ड</span>`;
    
    database.ref('users/' + userId).update({
        status: 'expired'
    }).catch(() => {});
}

// प्रैक्टिस शुरू करें
function startPractice() {
    const userPlanStatus = localStorage.getItem('user_plan_status');
    const userActivePlan = localStorage.getItem('user_plan_type');
    
    console.log("Starting practice - Plan status:", userPlanStatus, "Active plan:", userActivePlan);
    
    if (userPlanStatus === 'premium' && userActivePlan) {
        window.location.href = "game.html";
    } else {
        window.location.href = "game.html?mode=free";
    }
}

// डिबग फंक्शन
function checkLocalStorage() {
    console.log("🔍 LocalStorage Check:");
    console.log("user_plan_status:", localStorage.getItem('user_plan_status'));
    console.log("user_plan_type:", localStorage.getItem('user_plan_type'));
    console.log("kbc_email:", localStorage.getItem('kbc_email'));
    console.log("user_id:", localStorage.getItem('user_id'));
}

// Guest Login
window.loginAsGuest = function() {
    console.log("Guest button clicked!");
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('user_plan_type', 'free');
    localStorage.setItem('user_plan_status', 'active');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
    document.getElementById('welcome-msg').innerHTML = "👋 स्वागत है, <strong>Guest User</strong>!";
    document.getElementById('user-plan-display').innerHTML = `
        <div style="padding:10px;">
            🎯 <b>GUEST MODE एक्टिव</b><br>
            <small>सभी फ्री फीचर्स उपलब्ध</small>
        </div>
    `;
    document.getElementById('user-plan-display').style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
    
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.innerText = "Exit Guest Mode";
        logoutBtn.onclick = function() {
            localStorage.clear();
            location.reload();
        };
    }
};
