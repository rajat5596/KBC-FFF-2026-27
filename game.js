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

// --- 1. पेज लोड होते ही ---
window.onload = function() {
    console.log("🚀 Game starting...");
    
    // Sirf emergency ke liye backup
    currentQuestionsPool = [
        { q: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: ["15 अगस्त", "26 जनवरी", "2 अक्टूबर", "14 नवंबर"], a: "BACD" }
    ];

    let gameStarted = false;

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && !gameStarted) {
                const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
                
                try {
                    const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                    const userData = snapshot.val();
                    
                    if (userData && userData.status === 'active') {
                        userPlan = userData.plan.toLowerCase().trim();
                        if (typeof updatePlanDisplay === 'function') updatePlanDisplay(userPlan, userData.expiry);
                        
                        // JSON Fetch Logic
                        const fileName = `${userPlan}_questions.json`;
                        console.log("Fetching questions from:", fileName);

                        const response = await fetch(fileName + "?v=" + Date.now());
                        if (response.ok) {
                            const premiumData = await response.json();
                            if (premiumData && premiumData.length > 0) {
                                currentQuestionsPool = premiumData.sort(() => Math.random() - 0.5);
                                console.log("✅ Questions Loaded Successfully!");
                            }
                        }
                    }
                } catch (err) { 
                    console.error("Fetch Error:", err); 
                }
                
                gameStarted = true;
                loadNewQuestion();
            } else if (!user && !gameStarted) {
                window.location.replace("index.html");
            }
        });
    }
};

// --- 2. नया सवाल लोड करना ---
function loadNewQuestion() {
    // Plan limit check
    if (userPlan === 'free' && questionsPlayed >= 5) {
        bgMusic.pause(); clockSound.pause();
        if (confirm("🎯 आपके मुफ्त सवाल पूरे हुए! प्रीमियम प्लान लें?")) {
            window.open("https://rzp.io/rzp/15geGvLS_conv", "_blank");
        }
        window.location.replace("index.html");
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        console.error("No questions in pool!");
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    // UI Updates
    const qText = document.getElementById('question-text');
    const timerText = document.getElementById('timer');
    if (qText) qText.innerText = currentQuestion.q || currentQuestion.question;
    if (timerText) timerText.innerText = timeLeft;
    
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

// --- बाकी Game Functions (Lock, Check, Timer) ---
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

function lockAnswer() {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (!lockBtn || lockBtn.disabled) return;
    if (userSequence.length < 4) { alert("⚠️ कृपया सभी 4 विकल्प चुनें!"); return; }
    
    lockBtn.disabled = true;
    lockBtn.innerHTML = '⏳ चेक हो रहा है...';
    clearInterval(timerId);
    bgMusic.pause(); clockSound.pause();
    lockSound.play().catch(() => {});
    setTimeout(checkAnswer, 800);
}

function checkAnswer() {
    const resultPara = document.getElementById('result');
    const isCorrect = (userSequence === currentQuestion.correct);
    if (isCorrect) {
        correctSound.play().catch(() => {});
        resultPara.innerHTML = "<span style='color:#00FF00'>🎉 सही जवाब!</span>";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.innerHTML = `<span style='color:#FF0000'>❌ गलत! सही: ${currentQuestion.correct}</span>`;
    }
    
    questionsPlayed++;
    setTimeout(loadNewQuestion, 3000);
}

function startTimer() {
    if (timerId) clearInterval(timerId);
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            lockAnswer();
        }
    }, 1000);
}
