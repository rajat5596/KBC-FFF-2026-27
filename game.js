// --- ऑडियो फाइल्स ---
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = new Audio('audio/wrong.mp3');

let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};
let questionsPlayed = 0; 
let currentQuestionsPool = []; 
let userPlan = 'free'; 

// --- 1. पेज लोड होते ही डेटा तैयार करना ---
window.onload = function() {
    // पहले चेक करो कि Firebase लोड हुआ या नहीं
    if (typeof firebase === 'undefined') {
        console.log("Firebase लोड नहीं हुआ, फ्री मोड में चल रहे हैं");
        setTimeout(() => {
            useDefaultFreeQuestions();
        }, 500);
        return;
    }

    // Firebase Auth State Change Handler - सिर्फ एक बार
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // यूजर लॉगिन है
            const phoneNumber = user.phoneNumber; // "+919889904191"
            const cleanPhone = phoneNumber.replace("+91", "").replace("+", ""); // "9889904191"
            
            console.log("✅ यूजर लॉगिन:", cleanPhone);
            
            // Firebase से डेटा लोड करें
            try {
                const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                const userData = snapshot.val();
                
                console.log("📦 Firebase डेटा:", userData);
                
                if (userData && userData.plan && userData.status === "active") {
                    // Expiry चेक करें
                    const expiryDate = new Date(userData.expiry);
                    const today = new Date();
                    
                    if (expiryDate > today) {
                        userPlan = userData.plan.toLowerCase().trim();
                        console.log(`💎 प्रीमियम यूजर: ${userPlan}`);
                        
                        // UI में प्लान दिखाएं (अगर game.html में display है तो)
                        showUserPlan(userPlan, expiryDate);
                    } else {
                        console.log("⚠️ प्लान एक्सपायर हो गया");
                        userPlan = 'free';
                        showUserPlan('expired');
                        
                        // Update Firebase status
                        await firebase.database().ref('users/' + cleanPhone).update({
                            status: 'expired'
                        });
                    }
                } else {
                    console.log("ℹ️ फ्री यूजर (कोई प्लान नहीं)");
                    userPlan = 'free';
                    showUserPlan('free');
                }
            } catch (error) {
                console.error("❌ Firebase एरर:", error);
                userPlan = 'free';
                showUserPlan('free');
            }
        } else {
            // यूजर लॉगिन नहीं है
            console.log("⚠️ कोई यूजर लॉगिन नहीं, redirect to index");
            window.location.href = "index.html";
            return;
        }
        
        // प्लान के हिसाब से सवाल लोड करें
        loadFinalQuestions();
    });
};

// --- 2. सवालों को लोड और SHUFFLE करना ---
async function loadFinalQuestions() {
    let fileName = ''; 
    
    console.log("🎯 Loading questions for plan:", userPlan);
    
    // प्रीमियम प्लान के लिए फाइल नाम
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    // प्रीमियम यूजर के लिए
    if (fileName !== '') {
        try {
            console.log("📥 Loading premium file:", fileName);
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error('फाइल नहीं मिली');
            }
            let data = await response.json();
            console.log(`✅ ${data.length} प्रीमियम सवाल लोड हुए`);
            // सवालों को फेंटना
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            console.log("❌ प्रीमियम सवाल नहीं मिले, फ्री लोड कर रहे हैं", e);
            useDefaultFreeQuestions();
        }
    } else {
        // फ्री यूजर के लिए
        console.log("🎯 Free user, loading free questions");
        useDefaultFreeQuestions();
    }
}

// फ्री सवाल लोड करने का फंक्शन
function useDefaultFreeQuestions() {
    // चेक करो कि fffQuestions मौजूद है या नहीं
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        console.log(`✅ ${fffQuestions.length} फ्री सवाल मिले`);
        // फ्री सवालों को फेंटना
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        // अगर नहीं मिले तो 500ms बाद फिर कोशिश करो
        console.log("⏳ fffQuestions नहीं मिला, फिर कोशिश कर रहे हैं...");
        setTimeout(useDefaultFreeQuestions, 500);
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    // फ्री यूजर के लिए 10 सवालों की लिमिट
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    // चेक करो कि सवाल बाकी हैं या नहीं
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        console.log("❌ कोई सवाल नहीं बचा");
        
        // अगर सवाल खत्म हो गए तो फिर से लोड करो
        if (userPlan === 'free') {
            useDefaultFreeQuestions();
        } else {
            alert("सारे सवाल खत्म हो गए हैं! पेज रिफ्रेश करें।");
        }
        return;
    }

    // नया सवाल लोड करो
    currentQuestion = currentQuestionsPool.shift(); 
    
    console.log("📝 नया सवाल:", currentQuestion.question);
    
    // UI अपडेट करो
    userSequence = "";
    timeLeft = 20;
    
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.innerText = timeLeft;
    
    const questionEl = document.getElementById('question-text');
    if (questionEl) questionEl.innerText = currentQuestion.question;
    
    const resultEl = document.getElementById('result');
    if (resultEl) resultEl.innerText = "";
    
    // ऑप्शन बटन बनाओ
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) optionsContainer.innerHTML = optionsHTML;

    // बैकग्राउंड म्यूजिक चलाओ
    try {
        bgMusic.currentTime = 0;
        bgMusic.play().catch(e => console.log("🔇 ऑडियो नहीं चल सका:", e));
    } catch (e) {
        console.log("🔇 ऑडियो error:", e);
    }
    
    // टाइमर शुरू करो
    startTimer();
}

// --- टाइमर शुरू करना ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    
    try {
        clockSound.currentTime = 0;
        clockSound.play().catch(e => {});
    } catch (e) {}
    
    timerId = setInterval(() => {
        timeLeft--;
        
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence(); 
        }
    }, 1000);
}

// --- ऑप्शन सिलेक्ट करना ---
function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        if(btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
    }
}

// --- जवाब चेक करना ---
function checkSequence() {
    clearInterval(timerId);
    
    try {
        bgMusic.pause();
        clockSound.pause();
        lockSound.play().catch(e => {});
    } catch (e) {}

    const resultPara = document.getElementById('result');
    
    if (userSequence === currentQuestion.correct) {
        try { correctSound.play().catch(e => {}); } catch (e) {}
        if (resultPara) {
            resultPara.style.color = "#00FF00";
            resultPara.innerText = "अद्भुत! सही जवाब।";
        }
    } else {
        try { wrongSound.play().catch(e => {}); } catch (e) {}
        if (resultPara) {
            resultPara.style.color = "#FF0000";
            resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
        }
    }

    questionsPlayed++;
    
    // अगला सवाल 3.5 सेकंड बाद
    setTimeout(loadNewQuestion, 3500);
}

// --- लिमिट खत्म होने पर ---
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/15geGvLS_conv"; 
    
    if (confirm("🎯 10 मुफ्त सवाल पूरे! आगे के लिए प्रीमियम लें?")) {
        // Get current user phone
        const user = firebase.auth().currentUser;
        if (user) {
            const phone = user.phoneNumber.replace("+91", "");
            alert(`✅ पेमेंट पेज पर जा रहे हैं\n📱 फोन: ${phone}\n💰 प्लान चुनें`);
        }
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}

// --- प्लान दिखाने का फंक्शन (game.html के लिए) ---
function showUserPlan(plan, expiryDate) {
    // प्लान दिखाने के लिए HTML एलिमेंट ढूंढें
    let planDiv = document.getElementById('user-plan-display');
    
    // अगर game.html में एलिमेंट नहीं है तो कोई बात नहीं
    if (!planDiv) {
        console.log("ℹ️ user-plan-display element game.html में नहीं है");
        return;
    }
    
    // प्लान के हिसाब से दिखाएं
    if (plan === 'silver') {
        planDiv.style.background = 'linear-gradient(135deg, #808080, #C0C0C0)';
        planDiv.style.color = '#000';
        planDiv.innerHTML = `<span style="font-size:1.5rem;">🥈</span> सिल्वर यूजर`;
    } else if (plan === 'gold') {
        planDiv.style.background = 'linear-gradient(135deg, #B8860B, #FFD700)';
        planDiv.style.color = '#000';
        planDiv.innerHTML = `<span style="font-size:1.5rem;">🥇</span> गोल्ड यूजर`;
    } else if (plan === 'platinum') {
        planDiv.style.background = 'linear-gradient(135deg, #4a4a4a, #E5E4E2)';
        planDiv.style.color = '#000';
        planDiv.innerHTML = `<span style="font-size:1.5rem;">💎</span> प्लैटिनम यूजर`;
    } else if (plan === 'expired') {
        planDiv.style.background = 'linear-gradient(135deg, #c0392b, #e74c3c)';
        planDiv.style.color = '#fff';
        planDiv.innerHTML = `<span style="font-size:1.5rem;">⚠️</span> प्लान एक्सपायर`;
    } else {
        planDiv.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        planDiv.style.color = '#fff';
        planDiv.innerHTML = `<span style="font-size:1.5rem;">🎯</span> फ्री यूजर (10 सवाल)`;
    }
    
    // Expiry date दिखाएं (अगर है तो)
    if (expiryDate && plan !== 'free' && plan !== 'expired') {
        const expirySpan = document.createElement('span');
        expirySpan.style.fontSize = '0.9rem';
        expirySpan.style.marginLeft = '10px';
        expirySpan.style.opacity = '0.9';
        expirySpan.style.background = 'rgba(0,0,0,0.2)';
        expirySpan.style.padding = '2px 8px';
        expirySpan.style.borderRadius = '12px';
        expirySpan.innerText = `exp: ${expiryDate.toLocaleDateString('hi-IN')}`;
        planDiv.appendChild(expirySpan);
    }
            }
