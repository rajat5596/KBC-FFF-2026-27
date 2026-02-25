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

// --- प्लान दिखाने का फंक्शन ---
function updatePlanDisplay(plan, expiryDate) {
    const planDisplay = document.getElementById('user-plan-display');
    if (!planDisplay) return;
    
    const icons = { silver: '🥈', gold: '🥇', platinum: '💎', free: '🎯' };
    const icon = icons[plan] || '🎯';
    
    let displayText = `${icon} ${plan.toUpperCase()} प्लान`;
    if (expiryDate && plan !== 'free') {
        const date = new Date(expiryDate).toLocaleDateString('hi-IN');
        displayText += ` | वैधता: ${date}`;
    }
    planDisplay.innerHTML = displayText;
    
    // Colors according to plan
    const colors = {
        silver: 'linear-gradient(135deg, #808080, #C0C0C0)',
        gold: 'linear-gradient(135deg, #B8860B, #FFD700)',
        platinum: 'linear-gradient(135deg, #4a4a4a, #E5E4E2)',
        free: 'linear-gradient(135deg, #27ae60, #2ecc71)'
    };
    planDisplay.style.background = colors[plan] || colors.free;
}

// --- 1. पेज लोड होते ही (SINGLE window.onload) ---
window.onload = function() {
    console.log("🚀 Game starting...");
    
    // पहले फ्री सवाल लोड करो (हमेशा बैकअप के लिए)
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण (Debut) के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:", options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" }, correct: "DCBA" },
        { question: "इन रंगों को इंद्रधनुष (Rainbow) के क्रम में लगाएं (नीचे से ऊपर):", options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" }, correct: "CDAB" },
        { question: "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" },
        { question: "इन फिल्मों को उनके रिलीज वर्ष के अनुसार पुराने से नए क्रम में लगाएं:", options: { A: "दंगल", B: "शोले", C: "लगान", D: "बाहुबली" }, correct: "BCAD" },
        { question: "इन शहरों को उनकी जनसंख्या के हिसाब से घटते क्रम (ज्यादा से कम) में लगाएं:", options: { A: "मुंबई", B: "दिल्ली", C: "बेंगलुरु", D: "चेन्नई" }, correct: "BACD" },
        { question: "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:", options: { A: "पृथ्वी", B: "बुध", C: "मंगल", D: "शुक्र" }, correct: "BDAC" },
        { question: "इन केबीसी पड़ावों (Levels) को उनकी राशि के हिसाब से बढ़ते क्रम में लगाएं:", options: { A: "10,000", B: "1,60,000", C: "5,000", D: "3,20,000" }, correct: "CABD" },
        { question: "इन त्योहारों को कैलेंडर वर्ष में आने वाले क्रम में लगाएं:", options: { A: "होली", B: "दीवाली", C: "रक्षा बंधन", D: "गणेश चतुर्थी" }, correct: "ACDB" }
    ];
    
    currentQuestionsPool = [...freeQuestions].sort(() => Math.random() - 0.5);
    
    // Firebase चेक करो अगर उपलब्ध हो
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // नंबर साफ करो (+91 हटाओ)
                const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
                console.log("✅ User logged in:", cleanPhone);
                
                try {
                    const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                    const userData = snapshot.val();
                    console.log("📦 Firebase data:", userData);
                    
                    if (userData && userData.status === 'active') {
                        const expiryDate = new Date(userData.expiry);
                        if (expiryDate > new Date()) {
                            userPlan = userData.plan.toLowerCase().trim();
                            console.log("💎 Premium plan detected:", userPlan);
                            updatePlanDisplay(userPlan, userData.expiry);
                            
                            // प्रीमियम सवाल लोड करने की कोशिश करो
                            try {
                                const fileName = userPlan + '_questions.json';
                                const response = await fetch(fileName + "?v=" + Date.now());
                                if (response.ok) {
                                    const premiumData = await response.json();
                                    if (premiumData && premiumData.length > 0) {
                                        currentQuestionsPool = premiumData.sort(() => Math.random() - 0.5);
                                        console.log(`✅ ${userPlan} सवाल लोड हुए:`, premiumData.length);
                                    }
                                }
                            } catch (e) {
                                console.log("Premium load failed, using free:", e);
                            }
                        } else {
                            console.log("⚠️ Plan expired");
                            updatePlanDisplay('free');
                        }
                    } else {
                        console.log("ℹ️ Free user");
                        updatePlanDisplay('free');
                    }
                } catch (error) {
                    console.log("Firebase error:", error);
                    updatePlanDisplay('free');
                }
            } else {
                console.log("No user logged in");
                window.location.replace("index.html");
                return;
            }
            
            // गेम शुरू करो
            loadNewQuestion();
        });
    } else {
        console.log("Firebase not available - free mode");
        updatePlanDisplay('free');
        loadNewQuestion();
    }
    
    console.log("✅ Game ready!", currentQuestionsPool.length, "questions loaded");
};

// --- उत्तर लॉक करने का फंक्शन ---
function lockAnswer() {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (!lockBtn) return;
    
    if (userSequence.length === 0) {
        alert("⚠️ पहले कोई विकल्प चुनें!");
        return;
    }
    
    if (userSequence.length < 4) {
        alert(`⚠️ केवल ${userSequence.length} विकल्प चुने गए। सभी 4 विकल्प चुनें।`);
        return;
    }
    
    lockBtn.disabled = true;
    lockBtn.innerHTML = '⏳ जवाब चेक हो रहा है...';
    
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(() => {});
    
    setTimeout(() => {
        checkAnswer();
    }, 500);
}

// --- जवाब चेक करने का फंक्शन ---
function checkAnswer() {
    const resultPara = document.getElementById('result');
    const lockBtn = document.getElementById('lock-answer-btn');
    
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerHTML = "🎉 <strong>अद्भुत! सही जवाब!</strong> 🎉";
        
        for (let key of userSequence) {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.style.background = "#4CAF50";
                btn.style.borderColor = "#fff";
                btn.style.boxShadow = "0 0 20px #4CAF50";
            }
        }
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerHTML = `❌ <strong>गलत!</strong> सही क्रम: ${currentQuestion.correct}`;
        
        for (let key of userSequence) {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.style.background = "#f44336";
                btn.style.borderColor = "#fff";
            }
        }
        
        for (let key of currentQuestion.correct) {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.style.border = "4px solid #00FF00";
                btn.style.boxShadow = "0 0 20px #00FF00";
            }
        }
    }

    questionsPlayed++;
    
    setTimeout(() => {
        for (let key in currentQuestion.options) {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.style.background = "linear-gradient(145deg, #2c3e50, #3498db)";
                btn.style.border = "2px solid #ffd700";
                btn.style.boxShadow = "none";
                btn.innerHTML = `${key}: ${currentQuestion.options[key]}`;
            }
        }
        
        if (lockBtn) {
            lockBtn.disabled = false;
            lockBtn.innerHTML = '🔒 उत्तर लॉक करें';
        }
        
        resultPara.innerHTML = "";
        loadNewQuestion();
    }, 3500);
}

// --- ऑप्शन सेलेक्ट करना ---
function selectOption(key) {
    if (!userSequence.includes(key) && userSequence.length < 4) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        if(btn) {
            btn.style.background = "#ffd700";
            btn.style.color = "black";
            btn.style.border = "3px solid #00ff00";
            btn.style.boxShadow = "0 0 15px #ffd700";
            btn.innerHTML = `${key}: ${currentQuestion.options[key]} [${userSequence.length}/4]`;
        }
        console.log("Selected:", key, "Sequence:", userSequence);
    }
}

// --- टाइमर शुरू करना ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    
    timeLeft = 20;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.innerText = timeLeft;
    
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    
    timerId = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            lockAnswer(); // समय खत्म होने पर auto लॉक
        }
    }, 1000);
}

// --- नया सवाल लोड करना ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        if (confirm("🎯 10 मुफ्त सवाल पूरे! प्रीमियम लें?")) {
            window.location.href = "https://rzp.io/rzp/15geGvLS_conv";
        } else {
            window.location.href = "index.html";
        }
        return;
    }
    
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        document.getElementById('question-text').innerHTML = "सवाल खत्म! होम जाएँ।";
        document.getElementById('options-container').innerHTML = "";
        return;
    }
    
    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;
    
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";
    
    for (let key in currentQuestion.options) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    }
    
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
    
    console.log("📝 New question loaded:", currentQuestion.question);
}
