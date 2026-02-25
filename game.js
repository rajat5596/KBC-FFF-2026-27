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

// --- 1. पेज लोड होते ही ---
window.onload = function() {
    console.log("🚀 Game starting...");
    
    // Fallback questions agar koi file load na ho
    const backupQuestions = [
        { q: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: ["15 अगस्त", "26 जनवरी", "2 अक्टूबर", "14 नवंबर"], a: "BACD" }
    ];
    currentQuestionsPool = [...backupQuestions];

    let gameStarted = false;
    // Timeout backup
    const fallbackTimer = setTimeout(() => {
        if (!gameStarted) {
            loadNewQuestion();
            gameStarted = true;
        }
    }, 3500);

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && !gameStarted) {
                clearTimeout(fallbackTimer);
                const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
                
                try {
                    const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                    const userData = snapshot.val();
                    
                    if (userData && userData.status === 'active') {
                        userPlan = userData.plan.toLowerCase().trim();
                        updatePlanDisplay(userPlan, userData.expiry);
                        
                        // IMPORTANT: JSON Fetch Logic
                        // Vercel par file ko bina "/" ke fetch karna behtar hai
                        const fileName = `${userPlan}_questions.json`;
                        console.log("Fetching:", fileName);

                        const response = await fetch(fileName + "?v=" + Date.now());
                        if (response.ok) {
                            const premiumData = await response.json();
                            if (premiumData && premiumData.length > 0) {
                                currentQuestionsPool = premiumData.sort(() => Math.random() - 0.5);
                                console.log("✅ Premium Data Loaded!");
                            }
                        } else {
                            console.error("❌ File not found:", fileName);
                        }
                    } else {
                        // Free user logic
                        userPlan = 'free';
                        const res = await fetch('free_questions.json');
                        if(res.ok) currentQuestionsPool = await res.json();
                    }
                } catch (err) { 
                    console.error("Firebase/Fetch Error:", err); 
                }
                
                loadNewQuestion();
                gameStarted = true;
            } else if (!user && !gameStarted) {
                window.location.replace("index.html");
            }
        });
    }
};

// --- 2. नया सवाल लोड करना (Fixed Syntax) ---
function loadNewQuestion() {
    // Limit check for free users
    if (userPlan === 'free' && questionsPlayed >= 5) {
        bgMusic.pause(); clockSound.pause();
        if (confirm("🎯 आपके 5 मुफ्त सवाल पूरे हुए! प्रीमियम प्लान लें?")) {
            window.open("https://rzp.io/rzp/15geGvLS_conv", "_blank");
        }
        window.location.replace("index.html");
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सवाल लोड नहीं हो पाए या खत्म हो गए!");
        window.location.replace("index.html");
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    // UI Setup
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.q || currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    currentQuestion.correct = currentQuestion.a || currentQuestion.correct;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";
    
    const optionKeys = ['A', 'B', 'C', 'D'];
    const optionsData = currentQuestion.options;

    optionKeys.forEach((key, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        let optionText = Array.isArray(optionsData) ? optionsData[index] : optionsData[key];
        btn.innerHTML = `${key}: ${optionText}`;
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    });

    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) { lockBtn.disabled = false; lockBtn.innerHTML = '🔒 उत्तर लॉक करें'; }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
    }
            
// --- 2. नया सवाल लोड करना ---
function loadNewQuestion() {
    console.log("📝 loadNewQuestion called, questionsPlayed:", questionsPlayed, "userPlan:", userPlan);

    // 🔁 FREE USER KI LIMIT CHECK (5 SAWAL)
    if (userPlan === 'free' && questionsPlayed >= 5) {
        console.log("🎯 Free limit reached! Showing popup...");

        bgMusic.pause();
        clockSound.pause();

        // ⚠️ YAHI SE UPGRADE KA PAGE OPEN HOGA
        let userWantsPremium = confirm("🎯 5 मुफ्त सवाल पूरे हो गए!\n\nप्रीमियम प्लान लेकर 500+ सवाल खेलें?\n✓ सिल्वर: 500 सवाल\n✓ गोल्ड: 1500 सवाल\n✓ प्लैटिनम: अनलिमिटेड");

        if (userWantsPremium) {
            console.log("➡️ User wants premium. Redirecting to payment page...");
            window.location.href = "https://rzp.io/rzp/I5geGyLS"; // 👈 यही लिंक काम करेगा
        } else {
            console.log("🏠 User refused premium. Going to index.html");
            window.location.replace("index.html");
        }
        return;
    }

    // Agar pool me sawaal nahi bache
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        console.log("❌ No questions left!");
        alert("सारे सवाल खत्म हो गए हैं!");
        window.location.replace("index.html");
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.q || currentQuestion.question;
    document.getElementById('result').innerText = "";

    currentQuestion.correct = currentQuestion.a || currentQuestion.correct;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    const optionKeys = ['A', 'B', 'C', 'D'];
    const optionsData = currentQuestion.options;

    optionKeys.forEach((key, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;

        let optionText = Array.isArray(optionsData) ? optionsData[index] : optionsData[key];

        btn.innerHTML = `${key}: ${optionText}`;
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    });

    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        lockBtn.disabled = false;
        lockBtn.innerHTML = '🔒 उत्तर लॉक करें';
    }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

// --- 3. उत्तर लॉक करना ---
function lockAnswer() {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (!lockBtn || lockBtn.disabled) return;
    
    if (userSequence.length < 4) {
        alert("⚠️ कृपया सभी 4 विकल्प चुनें!");
        return;
    }
    
    lockBtn.disabled = true;
    lockBtn.innerHTML = '⏳ चेक हो रहा है...';
    
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(() => {});
    
    setTimeout(checkAnswer, 800);
}

// --- 4. जवाब चेक करना ---
function checkAnswer() {
    const resultPara = document.getElementById('result');
    const isCorrect = (userSequence === currentQuestion.correct);
    
    if (isCorrect) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerHTML = "🎉 <strong>सही जवाब!</strong>";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerHTML = `❌ <strong>गलत!</strong> सही: ${currentQuestion.correct}`;
    }

    for (let key of ['A', 'B', 'C', 'D']) {
        const btn = document.getElementById(`btn-${key}`);
        if (!btn) continue;
        if (currentQuestion.correct.indexOf(key) !== -1 && isCorrect) {
            btn.style.background = "#4CAF50";
        } else if (userSequence.indexOf(key) !== -1 && !isCorrect) {
            btn.style.background = "#f44336";
        }
        if (currentQuestion.correct.indexOf(key) !== -1 && !isCorrect) {
            btn.style.border = "4px solid #00FF00";
        }
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3000);
}

// --- 5. ऑप्शन चुनna ---
function selectOption(key) {
    if (!userSequence.includes(key) && userSequence.length < 4) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        if(btn) {
            btn.style.background = "#ffd700";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
    }
}

// --- 6. टाइमर ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    timeLeft = 20;
    const timerEl = document.getElementById('timer');
    
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    
    timerId = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            if(userSequence.length < 4) {
                const keys = ['A','B','C','D'];
                keys.forEach(k => { if(!userSequence.includes(k)) userSequence += k; });
            }
            lockAnswer();
        }
    }, 1000);
}

function logout() {
    localStorage.clear();
    firebase.auth().signOut().then(() => window.location.replace("index.html"));
}

function checkPlanAccess(clickedPlan) {
    if (userPlan !== 'free' && userPlan !== clickedPlan) {
        alert(`आपका अभी ${userPlan.toUpperCase()} प्लान सक्रिय है। इसे अपग्रेड करने के लिए कस्टमर सपोर्ट से संपर्क करें।`);
    } else if (userPlan === clickedPlan) {
        alert("यह प्लान पहले से ही सक्रिय है!");
    } else {
        window.open("https://rzp.io/rzp/I5geGyLS", '_self');
    }
}
