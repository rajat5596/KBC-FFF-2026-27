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
        currentQuestionsPool = currentQuestionsPool.map(item => {
            if (item.q && Array.isArray(item.options) && item.a) {
                // Silver format
                const opts = {};
                item.options.forEach((opt, index) => {
                    opts[String.fromCharCode(65 + index)] = opt;  // 0 → A, 1 → B, etc.
                });
                
                // "a" text-based है, तो correct order letters में convert
                const correctOptions = item.a.split(',').map(s => s.trim());
                let correctStr = '';
                correctOptions.forEach(corrText => {
                    const idx = item.options.findIndex(opt => opt.trim() === corrText);
                    if (idx !== -1) correctStr += String.fromCharCode(65 + idx);
                });
                
                return {
                    question: item.q,
                    options: opts,
                    correct: correctStr
                };
            }
            // Free format (already good)
            return item;
        });

        loadNewQuestion();
    } catch (err) {
        console.error("Error:", err);
        alert("सवाल लोड नहीं हो रहे! Free मोड ट्राई करो।");
        loadFreeFallback();
    }
}

function loadFreeFallback() {
    // Ab kuch nahi – fallback off kar diya
    alert("File load nahi hui, lekin free mode mein sawal nahi hain!");
}

function loadNewQuestion() {
        if (currentQuestionsPool.length === 0) {
        alert("सभी सवाल खत्म!");
        window.location.href = "/";
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.q || currentQuestion['प्रश्न'] || currentQuestion.question || "Question missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = "";

    // Yeh line important hai – options को A, B, C, D में convert करो
    let options = currentQuestion.options || {};
    if (Array.isArray(currentQuestion['विकल्प'])) {
        // Hindi format array → A B C D object
        const letters = ['A', 'B', 'C', 'D'];
        currentQuestion['विकल्प'].forEach((opt, i) => {
            if (opt) {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.id = 'btn-' + letters[i];
                btn.innerHTML = letters[i] + ": " + opt;
                btn.addEventListener('click', () => selectOption(letters[i]));
                optsDiv.appendChild(btn);
            }
        });
    } else if (typeof options === 'object' && Object.keys(options).length > 0) {
        // Free format object {A:..., B:...}
        Object.keys(options).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.id = 'btn-' + key;
            btn.innerHTML = key + ": " + options[key];
            btn.addEventListener('click', () => selectOption(key));
            optsDiv.appendChild(btn);
        });
    } else {
        alert("Options missing in question!");
    }

    bgMusic.play().catch(() => {});
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
// Har 10 sawal ke baad Social Bar unit trigger (AdZilla jaisa chhota popup)
if (userPlan === 'free' && questionsPlayed > 0 && questionsPlayed % 10 === 0) {
    // Social Bar ko force reload/trigger karo (script reload se popup aayega)
    (function() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'https://pl28712423.effectivegatecpm.com/e8/d4/74/e8d4747620e17e5817130756fb7c22ff.js';
        document.body.appendChild(s);
    })();
    console.log("Social Bar (AdZilla) popup triggered at sawal:", questionsPlayed);
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
