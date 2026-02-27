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

// Plan detection
window.addEventListener('load', () => {
    console.log("🎯 Game शुरू...");
    
    // localStorage से plan लोड करो
    const savedPlan = localStorage.getItem('user_plan_type');
    if (savedPlan) {
        userPlan = savedPlan.toLowerCase().trim();
        console.log("✅ User plan loaded:", userPlan);
    } else {
        console.log("ℹ️ No plan found, using free");
        userPlan = 'free';
    }

    loadQuestions();
});

async function loadQuestions() {
    let fileName = 'free_questions.json';
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    console.log("📥 Loading:", fileName, "for plan:", userPlan);

    try {
        // Important: Add cache busting
        const url = fileName + '?v=' + Date.now();
        console.log("📥 Fetching from:", url);
        
        const res = await fetch(url);
        console.log("📥 Response status:", res.status);
        
        if (!res.ok) {
            throw new Error('File not found: ' + fileName + ' (Status: ' + res.status + ')');
        }
        
        const data = await res.json();
        console.log("📦 Raw data loaded, items:", data.length);
        
        // Agar data empty hai
        if (!data || data.length === 0) {
            throw new Error('File is empty');
        }
        
        // Convert to standard format
        currentQuestionsPool = data.map((item, index) => {
            // ... rest of your conversion code ...
        }).filter(q => q.question && Object.keys(q.options).length === 4);
        
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
        }
    ];
    currentQuestionsPool = freeQs.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    // Check if user is free and limit reached
    if (userPlan === 'free' && questionsPlayed >= 2) { // Testing ke liye 2 rakha hai, baad me 10 kar dena
        alert("🎯 2 मुफ्त सवाल पूरे! प्रीमियम लें?");
        window.location.href = "https://rzp.io/rzp/I5geGyLS";
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("❌ सभी सवाल खत्म!");
        window.location.href = "/";
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
        btn.id = 'btn-' + key;  // Simple ID: btn-A, btn-B, etc.
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.onclick = () => selectOption(key);
        optionsContainer.appendChild(btn);
    });

    // Play background music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("🔇 Audio error:", e));
    
    startTimer();
}

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

function lockAnswer() {
    if (userSequence.length < 4) {
        alert("⚠️ सभी 4 विकल्प चुनें!");
        return;
    }
    
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(() => {});
    
    checkSequence();
}

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

// Logout function
function logout() {
    localStorage.clear();
    firebase.auth().signOut().then(() => {
        window.location.replace("index.html");
    });
                        }
