// ऑडियो
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

// Page load hone par plan check + questions load
window.addEventListener('load', () => {
    console.log("Game शुरू...");

    // NEW: Practice mode (free) force karo
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'free') {
        userPlan = 'free';
        console.log("Practice/Free mode forced");
    } else {
        // Paid users ke liye normal localStorage se plan
        const savedPlan = localStorage.getItem('user_plan_type') || 'free';
        userPlan = savedPlan.toLowerCase().trim();
        console.log("Normal plan:", userPlan);
    }

    loadQuestions();
});

async function loadQuestions() {
    let fileName = 'free_questions.json';
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    try {
        console.log("Loading:", fileName);
        const res = await fetch(fileName + '?v=' + Date.now());
        if (!res.ok) throw new Error('File issue: ' + res.status);
        
        let data = await res.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        console.log("Questions loaded:", currentQuestionsPool.length);

        // Silver/Gold/Platinum format को normalize करो (options array → A/B/C/D object, correct text → letters)
        // Sab plans ke liye normalize (Hindi + English + mixed keys handle)
currentQuestionsPool = currentQuestionsPool.map(item => {
    // Flexible keys: English ya Hindi dono le lega
    let questionText = item.q || item['प्रश्न'] || item.question || item['प्रश्न '] || '';
    let optionsArr = item.options || item['विकल्प'] || item.options || [];
    let correctAns = item.a || item['उत्तर'] || item.output || item.correct || item['उत्तर '] || '';

    if (!questionText || !Array.isArray(optionsArr) || optionsArr.length < 2 || !correctAns) {
        console.warn("Invalid question skipped:", item);
        return null; // galat entry skip
    }

    // Options ko A/B/C/D object mein convert
    const opts = {};
    optionsArr.forEach((opt, idx) => {
        if (opt && opt.trim()) {
            opts[String.fromCharCode(65 + idx)] = opt.trim();
        }
    });

    // Correct answer text ko letters mein convert
    const correctParts = correctAns.split(',').map(s => s.trim());
    let correctLetters = '';
    correctParts.forEach(part => {
        const foundIdx = optionsArr.findIndex(opt => opt && opt.trim() === part);
        if (foundIdx !== -1) {
            correctLetters += String.fromCharCode(65 + foundIdx);
        }
    });

    // Agar correct match na mile to fallback (rare case)
    if (!correctLetters && correctParts.length > 0) {
        correctLetters = 'ABCD'; // default
    }

    return {
        question: questionText,
        options: opts,
        correct: correctLetters
    };
}).filter(q => q !== null && Object.keys(q.options).length >= 2); // kam se kam 2 options wale rakh

console.log("Total valid questions after normalize:", currentQuestionsPool.length);

if (currentQuestionsPool.length === 0) {
    console.error("No valid questions found for plan:", userPlan);
    alert("इस प्लान के सवाल उपलब्ध नहीं हैं या format में समस्या है! Free मोड ट्राई करें।");
    useHardcodedFreeQuestions(); // free fallback
}

        loadNewQuestion();
    } catch (err) {
        console.error("Error:", err);
        alert("सवाल लोड नहीं हो रहे! Free मोड ट्राई करो।");
        loadFreeFallback();
    }
}

function loadFreeFallback() {
    // Hardcoded 10 free questions (tumhare पुराने से copy कर लेना, example):
    const freeQs = [
        { question: "इन तिथियों को पहले से बाद क्रम में:", options: {A:"15 अगस्त", B:"26 जनवरी", C:"2 अक्टूबर", D:"14 नवंबर"}, correct: "BACD" },
        // Baaki 9 add kar do jaise pehle the
        // ...
    ];
    currentQuestionsPool = freeQs.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        alert("10 free सवाल खत्म! Upgrade करो।");
        window.location.href = "/";
        return;
    }
    if (currentQuestionsPool.length === 0) {
        alert("सभी सवाल खत्म!");
        window.location.href = "/";
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question || "Question missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = "";

    Object.keys(currentQuestion.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = 'btn-' + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.onclick = () => selectOption(key);
        optsDiv.appendChild(btn);
    });

    bgMusic.play().catch(e => {});
    startTimer();
}

function selectOption(key) {
    if (userSequence.includes(key)) return;
    userSequence += key;
    const btn = document.getElementById('btn-' + key);
    btn.style.background = 'gold';
    btn.style.color = 'black';
    btn.innerHTML += ` [${userSequence.length}]`;
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(e => {});

    const result = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(e => {});
        result.style.color = 'lime';
        result.innerText = 'सही जवाब! 🎉';
    } else {
        wrongSound.play().catch(e => {});
        result.style.color = 'red';
        result.innerText = 'गलत! सही: ' + currentQuestion.correct;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3000);
}

function startTimer() {
    clearInterval(timerId);
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    clockSound.currentTime = 0;
    clockSound.play().catch(e => {});

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence();
        }
    }, 1000);
}

// Lock button event
document.addEventListener('DOMContentLoaded', () => {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        lockBtn.addEventListener('click', checkSequence);
        console.log('Lock button ready! ID: lock-answer-btn');
    } else {
        console.warn('Lock button id="lock-answer-btn" नहीं मिला! HTML check karo.');
    }
});
