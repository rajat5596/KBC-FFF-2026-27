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
        console.log("Loading file:", fileName);
        const res = await fetch(fileName + '?v=' + Date.now());
        if (!res.ok) throw new Error('File issue: ' + res.status);
        
        let data = await res.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        console.log("Raw questions loaded:", currentQuestionsPool.length);

        // ==== SAB FORMATS HANDLE KAREGA (FREE + SILVER + GOLD + PLATINUM) ====
        currentQuestionsPool = currentQuestionsPool.map(item => {
            // Question text (sab keys support)
            let questionText = (item.question || item.q || item['प्रश्न'] || item['प्रश्न '] || '').trim();

            // Options (object ya array dono)
            let optionsInput = item.options || item['विकल्प'] || [];
            let isObjectFormat = !Array.isArray(optionsInput) && typeof optionsInput === 'object';
            let optionsArr = isObjectFormat ? Object.values(optionsInput) : optionsInput;

            // Correct answer (sab keys)
            let correctAns = (item.correct || item.a || item['उत्तर'] || item.output || '').trim();

            if (!questionText || optionsArr.length < 3 || !correctAns) {
                console.warn("Skipped invalid question");
                return null;
            }

            const opts = {};
            if (isObjectFormat) {
                // Free format (already A/B/C/D)
                Object.keys(optionsInput).forEach(key => {
                    opts[key] = optionsInput[key].trim();
                });
            } else {
                // Silver/Gold/Platinum format (array → A/B/C/D)
                optionsArr.forEach((opt, idx) => {
                    if (opt) opts[String.fromCharCode(65 + idx)] = opt.trim();
                });
            }

            // Correct letters banao
            let correctLetters = '';
            if (isObjectFormat) {
                // Free format mein already "BACD" jaisa hota hai
                correctLetters = correctAns.toUpperCase().replace(/[^ABCD]/g, '');
            } else {
                // Text match (Hindi keys wale)
                const correctParts = correctAns.split(',').map(s => s.trim().toLowerCase());
                correctParts.forEach(part => {
                    const foundIdx = optionsArr.findIndex(opt => opt && opt.trim().toLowerCase() === part);
                    if (foundIdx !== -1) correctLetters += String.fromCharCode(65 + foundIdx);
                });
            }
            if (!correctLetters) correctLetters = 'ABCD';

            return {
                question: questionText,
                options: opts,
                correct: correctLetters
            };
        }).filter(q => q !== null && Object.keys(q.options).length >= 3);

        console.log("Final valid questions after normalize:", currentQuestionsPool.length);

        if (currentQuestionsPool.length === 0) {
            console.error("No valid questions for", userPlan);
            alert("इस प्लान में सवाल उपलब्ध नहीं हैं! Free मोड ट्राई करें।");
            loadFreeFallback();
            return;
        }

        loadNewQuestion();   // ← yeh line zaroori hai

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
