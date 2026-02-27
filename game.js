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
    
    const colors = {
        silver: 'linear-gradient(135deg, #808080, #C0C0C0)',
        gold: 'linear-gradient(135deg, #B8860B, #FFD700)',
        platinum: 'linear-gradient(135deg, #4a4a4a, #E5E4E2)',
        free: 'linear-gradient(135deg, #27ae60, #2ecc71)'
    };
    planDisplay.style.background = colors[plan] || colors.free;
}

// --- पेज लोड होते ही ---
window.addEventListener('load', () => {
    console.log("🎯 Game शुरू...");
    
    // Firebase auth check
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
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
                            
                            // Save to localStorage
                            localStorage.setItem('user_plan_status', 'premium');
                            localStorage.setItem('user_plan_type', userPlan);
                        } else {
                            console.log("⚠️ Plan expired");
                            userPlan = 'free';
                            updatePlanDisplay('free');
                            localStorage.setItem('user_plan_status', 'free');
                            localStorage.removeItem('user_plan_type');
                        }
                    } else {
                        console.log("ℹ️ Free user");
                        userPlan = 'free';
                        updatePlanDisplay('free');
                        localStorage.setItem('user_plan_status', 'free');
                        localStorage.removeItem('user_plan_type');
                    }
                } catch (err) {
                    console.log("Firebase error:", err);
                    // Try localStorage as fallback
                    const savedPlan = localStorage.getItem('user_plan_type');
                    if (savedPlan) {
                        userPlan = savedPlan;
                        console.log("✅ Using localStorage plan:", userPlan);
                        updatePlanDisplay(userPlan);
                    } else {
                        userPlan = 'free';
                        updatePlanDisplay('free');
                    }
                }
            } else {
                // No user logged in
                console.log("No user logged in");
                const savedPlan = localStorage.getItem('user_plan_type');
                if (savedPlan) {
                    userPlan = savedPlan;
                    console.log("✅ Using localStorage plan (no user):", userPlan);
                    updatePlanDisplay(userPlan);
                } else {
                    userPlan = 'free';
                    updatePlanDisplay('free');
                }
            }
            
            // Load questions
            loadQuestions();
        });
    } else {
        // Firebase not available
        console.log("Firebase not available");
        const savedPlan = localStorage.getItem('user_plan_type');
        if (savedPlan) {
            userPlan = savedPlan;
            console.log("✅ Using localStorage plan (no Firebase):", userPlan);
            updatePlanDisplay(userPlan);
        } else {
            userPlan = 'free';
            updatePlanDisplay('free');
        }
        loadQuestions();
    }
});

// --- सवाल लोड करने का मुख्य फंक्शन ---
async function loadQuestions() {
    let fileName = 'free_questions.json';
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    console.log("📥 Loading:", fileName, "for plan:", userPlan);

    try {
        const url = fileName + '?v=' + Date.now();
        console.log("📥 Fetching from:", url);
        
        const res = await fetch(url);
        console.log("📥 Response status:", res.status);
        
        if (!res.ok) {
            throw new Error('File not found: ' + fileName + ' (Status: ' + res.status + ')');
        }
        
        const data = await res.json();
        console.log("📦 Raw data loaded, items:", data.length);
        
        if (!data || data.length === 0) {
            throw new Error('File is empty');
        }
        
        // यहाँ सबसे महत्वपूर्ण हिस्सा - हिंदी फॉर्मेट कन्वर्जन
        const convertedQuestions = [];
        
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            // 1. प्रश्न निकालो
            let question = item['प्रश्न'] || item.question || '';
            
            // 2. विकल्प निकालो
            let options = {};
            
            // अगर 'विकल्प' है (हिंदी फॉर्मेट)
            if (item['विकल्प'] && Array.isArray(item['विकल्प'])) {
                const opts = item['विकल्प'];
                if (opts.length >= 4) {
                    options = {
                        A: opts[0] || '',
                        B: opts[1] || '',
                        C: opts[2] || '',
                        D: opts[3] || ''
                    };
                }
            }
            // अगर 'options' है (स्टैंडर्ड फॉर्मेट)
            else if (item.options) {
                options = item.options;
            }
            
            // 3. उत्तर निकालो और ABCD फॉर्मेट में बदलो
            let correct = '';
            let answerStr = item['उत्तर'] || item.correct || '';
            
            if (answerStr) {
                // अगर उत्तर में कॉमा है (हिंदी फॉर्मेट)
                if (answerStr.includes(',')) {
                    const parts = answerStr.split(',').map(p => p.trim());
                    const optsArray = item['विकल्प'] || [];
                    
                    for (let j = 0; j < parts.length; j++) {
                        const part = parts[j];
                        const index = optsArray.findIndex(opt => opt === part);
                        if (index !== -1) {
                            correct += String.fromCharCode(65 + index); // A, B, C, D
                        }
                    }
                }
                // अगर उत्तर सीधा ABCD है
                else if (/^[A-D]{4}$/.test(answerStr)) {
                    correct = answerStr;
                }
                // अगर उत्तर 'BACD' जैसा है
                else if (answerStr.length === 4) {
                    correct = answerStr;
                }
            }
            
            // फॉलबैक
            if (correct.length !== 4) {
                correct = 'ABCD';
            }
            
            // सिर्फ वैध सवाल जोड़ो
            if (question && Object.keys(options).length === 4) {
                convertedQuestions.push({
                    question: question,
                    options: options,
                    correct: correct
                });
            }
        }
        
        currentQuestionsPool = convertedQuestions;
        console.log(`✅ Valid questions: ${currentQuestionsPool.length}/${data.length}`);
        
        if (currentQuestionsPool.length === 0) {
            throw new Error('No valid questions after conversion');
        }
        
        // Shuffle
        currentQuestionsPool = currentQuestionsPool.sort(() => Math.random() - 0.5);
        loadNewQuestion();
        
    } catch (err) {
        console.error("❌ Error loading questions:", err);
        alert("फाइल लोड नहीं हो रही! फ्री मोड में जा रहे हैं।");
        loadFreeFallback();
    }
}

// --- फ्री फॉलबैक सवाल (अगर JSON न मिले) ---
function loadFreeFallback() {
    console.log("📝 Using free fallback questions");
    const freeQs = [
        {
            question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:",
            options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" },
            correct: "BACD"
        },
        {
            question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:",
            options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" },
            correct: "CBAD"
        },
        {
            question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:",
            options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" },
            correct: "DCBA"
        },
        {
            question: "इन रंगों को इंद्रधनुष के क्रम में लगाएं:",
            options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" },
            correct: "CDAB"
        }
    ];
    currentQuestionsPool = freeQs.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

// --- नया सवाल लोड करना ---
function loadNewQuestion() {
    // Check if user is free and limit reached (10 questions for free)
    if (userPlan === 'free' && questionsPlayed >= 10) {
        const upgrade = confirm("🎯 10 मुफ्त सवाल पूरे! प्रीमियम प्लान लेकर 500+ सवाल खेलें?");
        if (upgrade) {
            window.location.href = "https://rzp.io/rzp/I5geGyLS";
        } else {
            window.location.href = "index.html";
        }
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("❌ सभी सवाल खत्म!");
        window.location.href = "index.html";
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    console.log("📝 Loading question:", currentQuestion.question);

    // Update UI
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";

    // Create options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    Object.keys(currentQuestion.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = 'btn-' + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    });

    // Enable lock button
    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        lockBtn.disabled = false;
        lockBtn.innerHTML = '🔒 उत्तर लॉक करें';
    }

    // Play background music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("🔇 Audio error:", e));
    
    startTimer();
}

// --- ऑप्शन चुनना ---
function selectOption(key) {
    if (!userSequence.includes(key) && userSequence.length < 4) {
        userSequence += key;
        const btn = document.getElementById('btn-' + key);
        if (btn) {
            btn.style.background = "#ffd700";
            btn.style.color = "black";
            btn.style.border = "3px solid #00ff00";
            btn.innerHTML = key + ": " + currentQuestion.options[key] + " [" + userSequence.length + "/4]";
        }
        console.log("✅ Selected:", key, "Sequence:", userSequence);
    }
}

// --- उत्तर लॉक करना ---
function lockAnswer() {
    if (userSequence.length < 4) {
        alert("⚠️ सभी 4 विकल्प चुनें!");
        return;
    }
    
    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.innerHTML = '⏳ चेक हो रहा है...';
    }
    
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(() => {});
    
    checkSequence();
}

// --- जवाब चेक करना ---
function checkSequence() {
    const resultPara = document.getElementById('result');
    
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerHTML = "🎉 <strong>सही जवाब!</strong>";
        
        // Highlight correct options
        for (let key of userSequence) {
            const btn = document.getElementById('btn-' + key);
            if (btn) btn.style.background = "#4CAF50";
        }
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerHTML = "❌ <strong>गलत!</strong> सही: " + currentQuestion.correct;
        
        // Show correct answer
        for (let key of currentQuestion.correct) {
            const btn = document.getElementById('btn-' + key);
            if (btn) btn.style.border = "4px solid #00FF00";
        }
    }

    questionsPlayed++;
    console.log("📊 Questions played:", questionsPlayed);
    
    setTimeout(loadNewQuestion, 3000);
}

// --- टाइमर शुरू करना ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    
    const timerEl = document.getElementById('timer');
    
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    
    timerId = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            if (userSequence.length < 4) {
                // Auto-select remaining options
                const allKeys = ['A', 'B', 'C', 'D'];
                allKeys.forEach(k => {
                    if (!userSequence.includes(k)) userSequence += k;
                });
            }
            lockAnswer();
        }
    }, 1000);
}

// --- लॉगआउट फंक्शन ---
function logout() {
    localStorage.clear();
    if (typeof firebase !== 'undefined') {
        firebase.auth().signOut().then(() => {
            window.location.replace("index.html");
        }).catch(() => {
            window.location.replace("index.html");
        });
    } else {
        window.location.replace("index.html");
    }
}

// --- लॉक बटन के लिए इवेंट लिस्टनर ---
window.addEventListener('load', function() {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        // Remove old event listeners
        const newBtn = lockBtn.cloneNode(true);
        lockBtn.parentNode.replaceChild(newBtn, lockBtn);
        // Add new listener
        newBtn.addEventListener('click', lockAnswer);
        console.log("✅ Lock button event listener attached");
    }
});
