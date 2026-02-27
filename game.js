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

// --- पेज लोड होते ही ---
window.addEventListener('load', () => {
    console.log("Game शुरू हो रहा है...");

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'free') {
        userPlan = 'free';
        console.log("Free/Practice mode forced");
    } else {
        const savedPlan = localStorage.getItem('user_plan_type') || 'free';
        userPlan = savedPlan.toLowerCase().trim();
        console.log("User plan:", userPlan);
    }

    loadQuestions();
});

// --- सवाल लोड करो ---
async function loadQuestions() {
    let fileName = 'free_questions.json';

    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    console.log("Trying to load:", fileName);

    try {
        const res = await fetch(fileName + '?v=' + Date.now());
        console.log("Fetch status:", res.status);

        if (!res.ok) {
            throw new Error('File not found or error: ' + fileName);
        }

        const data = await res.json();
        console.log("Data loaded:", data.length, "sawal");

        currentQuestionsPool = data.sort(() => Math.random() - 0.5);

        // Simple normalize - keys flexible
        currentQuestionsPool = currentQuestionsPool.map(item => {
            let q = item['प्रश्न'] || item.question || item.q || 'Sawal missing';
            let optsInput = item['विकल्प'] || item.options || [];
            let ans = item['उत्तर'] || item.correct || item.a || 'ABCD';

            const opts = {};
            if (Array.isArray(optsInput)) {
                optsInput.forEach((opt, i) => {
                    if (opt) opts[String.fromCharCode(65 + i)] = opt.trim();
                });
            } else if (typeof optsInput === 'object') {
                Object.keys(optsInput).forEach(k => {
                    if (optsInput[k]) opts[k.toUpperCase()] = optsInput[k].trim();
                });
            }

            return {
                question: q.trim(),
                options: opts,
                correct: ans.toUpperCase()
            };
        });

        console.log("Processed sawal:", currentQuestionsPool.length);

        if (currentQuestionsPool.length === 0) {
            alert("Koi sawal nahi mila! Free mode chal raha hai.");
            loadFreeFallback();
        } else {
            loadNewQuestion();
        }
    } catch (err) {
        console.error("Load error:", err.message);
        alert("File load nahi ho rahi! Free mode mein ja rahe hain.");
        loadFreeFallback();
    }
}

// --- Free fallback (Hindi format) ---
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

// --- नया सवाल लोड करो ---
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
    document.getElementById('question-text').innerText = currentQuestion.question || currentQuestion['प्रश्न'] || "Sawal missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = "";

    Object.keys(currentQuestion.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = 'btn-' + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.addEventListener('click', () => selectOption(key));
        optsDiv.appendChild(btn);
    });

    bgMusic.play().catch(() => {});
    startTimer();
}

// --- ऑप्शन चुनो ---
function selectOption(key) {
    if (userSequence.includes(key)) return;
    userSequence += key;
    const btn = document.getElementById('btn-' + key);
    if (btn) {
        btn.style.background = 'gold';
        btn.style.color = 'black';
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

// --- उत्तर लॉक करो ---
function lockAnswer() {
    if (userSequence.length < 4) {
