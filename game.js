// --- ऑडियो फाइल्स ---
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = New Audio('audio/wrong.mp3');

let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};
let questionsPlayed = 0; 
let currentQuestionsPool = []; 
let userPlan = 'free'; 

// --- पेज लोड होते ही ---
window.onload = function() {
    console.log("🔥 Game starting...");
    
    // localStorage से plan लोड करो
    const savedPlan = localStorage.getItem('user_plan_type');
    if (savedPlan) {
        userPlan = savedPlan;
        console.log("✅ Plan loaded:", userPlan);
    }
    
    // Directly free_questions.json load करो (testing के लिए)
    loadQuestions();
};

// --- सवाल लोड करो ---
function loadQuestions() {
    console.log("📥 Loading free_questions.json...");
    
    fetch('free_questions.json?v=' + Date.now())
        .then(response => {
            console.log("📥 Response status:", response.status);
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ Data loaded:", data.length, "questions");
            
            // सीधा data use करो, कोई conversion नहीं
            currentQuestionsPool = data;
            
            // पहला सवाल लोड करो
            loadNewQuestion();
        })
        .catch(error => {
            console.error("❌ Error:", error);
            alert("फाइल लोड नहीं हुई! Console देखो।");
        });
}

// --- नया सवाल लोड करो ---
function loadNewQuestion() {
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("कोई सवाल नहीं!");
        return;
    }
    
    currentQuestion = currentQuestionsPool[0]; // पहला सवाल लो करो
    userSequence = "";
    timeLeft = 20;
    
    console.log("📝 Current question:", currentQuestion);
    
    // UI update
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question || "Question missing";
    document.getElementById('result').innerText = "";
    
    // Options बनाओ
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";
    
    // Options को A, B, C, D में दिखाओ
    const letters = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < letters.length; i++) {
        const key = letters[i];
        const optionText = currentQuestion.options ? currentQuestion.options[key] : "";
        
        if (optionText) {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.id = 'btn-' + key;
            btn.innerHTML = key + ": " + optionText;
            btn.onclick = () => selectOption(key);
            optionsContainer.appendChild(btn);
        }
    }
    
    startTimer();
}

// --- ऑप्शन चुनो ---
function selectOption(key) {
    if (!userSequence.includes(key) && userSequence.length < 4) {
        userSequence += key;
        const btn = document.getElementById('btn-' + key);
        if (btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
    }
}

// --- उत्तर लॉक करो ---
function lockAnswer() {
    if (userSequence.length < 4) {
        alert("सभी 4 विकल्प चुनें!");
        return;
    }
    
    clearInterval(timerId);
    checkSequence();
}

// --- जवाब चेक करो ---
function checkSequence() {
    const resultPara = document.getElementById('result');
    
    if (userSequence === currentQuestion.correct) {
        resultPara.style.color = "green";
        resultPara.innerText = "✅ सही जवाब!";
    } else {
        resultPara.style.color = "red";
        resultPara.innerText = "❌ गलत! सही: " + currentQuestion.correct;
    }
    
    questionsPlayed++;
    
    // अगला सवाल 2 सेकंड बाद
    setTimeout(() => {
        if (currentQuestionsPool.length > 1) {
            // अगला सवाल लोड करो
            currentQuestionsPool.shift();
            loadNewQuestion();
        } else {
            alert("सवाल खत्म!");
        }
    }, 2000);
}

// --- टाइमर शुरू करो ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    
    const timerEl = document.getElementById('timer');
    
    timerId = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            lockAnswer();
        }
    }, 1000);
}

// --- लॉगआउट ---
function logout() {
    window.location.href = "index.html";
}
