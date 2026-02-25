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
    
    // 1. Pehle Backup Questions ready rakho
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण (Debut) के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:", options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" }, correct: "DCBA" },
        { question: "इन रंगों को इंद्रधनुष (Rainbow) के क्रम में लगाएं (नीचे से ऊपर):", options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" }, correct: "CDAB" },
        { question: "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" }
    ];
    
    currentQuestionsPool = [...freeQuestions].sort(() => Math.random() - 0.5);

    // 2. Fail-safe: Agar 3 second tak Firebase load nahi hua, to game shuru kar do
    let gameStarted = false;
    const fallbackTimer = setTimeout(() => {
        if (!gameStarted) {
            console.log("⏳ Firebase timeout - Starting with Free Questions");
            updatePlanDisplay('free');
            loadNewQuestion();
            gameStarted = true;
        }
    }, 3000);

    // 3. Firebase Auth Check
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && !gameStarted) {
                clearTimeout(fallbackTimer); // Timeout cancel karo kyunki user mil gaya
                const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
                
                try {
                    const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                    const userData = snapshot.val();
                    
                    if (userData && userData.status === 'active') {
                        const expiryDate = new Date(userData.expiry);
                        if (expiryDate > new Date()) {
                            userPlan = userData.plan.toLowerCase().trim();
                            updatePlanDisplay(userPlan, userData.expiry);
                            
                            // Premium JSON load karne ki koshish
                            try {
                                const response = await fetch(`${userPlan}_questions.json?v=${Date.now()}`);
                                if (response.ok) {
                                    const premiumData = await response.json();
                                    if (premiumData.length > 0) {
                                        currentQuestionsPool = premiumData.sort(() => Math.random() - 0.5);
                                    }
                                }
                            } catch (e) { console.log("JSON fetch failed"); }
                        }
                    }
                } catch (err) { console.log("Firebase Data Error"); }
                
                loadNewQuestion();
                gameStarted = true;
            } else if (!user && !gameStarted) {
                // Agar user logged in nahi hai, to game shuru karne ke bajaye redirect karein
                window.location.replace("index.html");
            }
        });
    }
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
    // ... (Limit check wala code wahi rehne dein)

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;
    
    document.getElementById('timer').innerText = timeLeft;
    
    // YAHAN BADLAV HAI: 'q' key use karein
    document.getElementById('question-text').innerText = currentQuestion.q || currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";
    
    // YAHAN BADLAV HAI: Array options ko A, B, C, D mein convert karna
    const optionKeys = ['A', 'B', 'C', 'D'];
    const optionsData = currentQuestion.options; // Jo aapki file mein array hai

    optionKeys.forEach((key, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        
        // Agar array hai to index se uthaye, agar purana format hai to key se
        const optionText = Array.isArray(optionsData) ? optionsData[index] : optionsData[key];
        
        btn.innerHTML = key + ": " + optionText;
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    });

    // Correct Answer key fix: aapki file mein 'a' hai, backup mein 'correct'
    currentQuestion.correct = currentQuestion.a || currentQuestion.correct;
    
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}
