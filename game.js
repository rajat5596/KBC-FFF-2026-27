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
    console.log("Game शुरू...");
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'free') {
        userPlan = 'free';
        console.log("Free mode forced");
    } else {
        const savedPlan = localStorage.getItem('user_plan_type') || 'free';
        userPlan = savedPlan.toLowerCase().trim();
        console.log("User plan:", userPlan);
    }

    loadQuestions();
});

async function loadQuestions() {
    let fileName = 'free_questions.json';
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    try {
        const res = await fetch(fileName + '?v=' + Date.now());
        if (!res.ok) {
            throw new Error('File not found: ' + fileName);
        }
        const data = await res.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        console.log("Sawal load hue:", currentQuestionsPool.length);

        // Simple normalize for Hindi format (platinum/gold/silver)
        currentQuestionsPool = currentQuestionsPool.map(item => {
            const q = item['प्रश्न'] || item.q || item.question || 'Question missing';
            const optsArr = item['विकल्प'] || item.options || [];
            const ans = item['उत्तर'] || item.correct || item.a || '';

            const opts = {};
            if (Array.isArray(optsArr)) {
                optsArr.forEach((opt, i) => {
                    if (opt) opts[String.fromCharCode(65 + i)] = opt.trim();
                });
            } else if (typeof optsArr === 'object') {
                Object.keys(optsArr).forEach(k => {
                    opts[k.toUpperCase()] = optsArr[k].trim();
                });
            }

            let correct = ans.toUpperCase();
            if (!correct || correct.length < 1) correct = 'ABCD';

            return {
                question: q.trim(),
                options: opts,
                correct: correct
            };
        }).filter(q => q.question !== 'Question missing' && Object.keys(q.options).length >= 3);

        console.log("Valid sawal:", currentQuestionsPool.length);

        if (currentQuestionsPool.length === 0) {
            alert("Koi sawal nahi mila! Free mode chal raha hai.");
            loadFreeFallback();
        } else {
            loadNewQuestion();
        }
    } catch (err) {
        console.error("Error:", err.message);
        alert("File load nahi ho rahi! Free mode mein ja rahe hain.");
        loadFreeFallback();
    }
}

function loadFreeFallback() {
    const freeQs = [
        {
            "प्रश्न": "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:",
            "विकल्प": ["15 अगस्त", "26 जनवरी", "2 अक्टूबर", "14 नवंबर"],
            "उत्तर": "BACD"
        },
        {
            "प्रश्न": "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:",
            "विकल्प": ["विराट कोहली", "एमएस धोनी", "सचिन तेंदुलकर", "शुभमन गिल"],
            "उत्तर": "CBAD"
        },
        // Baaki 8 sawal add kar lo (purane free_questions.json se copy kar ke same format mein daal do)
        // Agar jaldi test karna hai to sirf 2-3 daal do
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
    userSequence = ""; // Reset sequence
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question || "Question missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = ""; // Clear old options

    Object.keys(currentQuestion.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = 'btn-' + key + Math.random().toString(36).substring(2, 7); // Unique ID for each button to avoid conflict
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.addEventListener('click', () => selectOption(key));
        optsDiv.appendChild(btn);
    });

    bgMusic.play().catch(() => {});
    startTimer();
}

function selectOption(key) {
    if (userSequence.includes(key)) return;
    userSequence += key;
    const btn = document.querySelector('[id^="btn-' + key + '"]'); // Find unique button
    if (btn) {
        btn.style.background = 'gold';
        btn.style.color = 'black';
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(() => {});

    const result = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        result.style.color = 'lime';
        result.innerText = 'सही जवाब! 🎉';
    } else {
        wrongSound.play().catch(() => {});
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
    clockSound.play().catch(() => {});

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText
