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

// Plan check localStorage se (index.html se aata hai)
window.onload = function() {
    console.log("🎮 Game starting...");

    // Silver/Gold/Platinum check
    const savedPlan = localStorage.getItem('user_plan_type');
    if (savedPlan) {
        userPlan = savedPlan.toLowerCase();
        console.log("✅ Plan mila:", userPlan);
    } else {
        console.log("Free user");
    }

    loadQuestionsForPlan();
};

async function loadQuestionsForPlan() {
    let fileName = '';
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    if (fileName !== '') {
        try {
            console.log("📥 Loading", fileName);
            const response = await fetch(fileName + "?v=" + Date.now());
            if (!response.ok) throw new Error("File nahi mila");
            
            const data = await response.json();
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            console.log("✅", userPlan.toUpperCase(), "questions loaded:", currentQuestionsPool.length);
            loadNewQuestion();
        } catch (e) {
            console.error("Fetch error:", e);
            alert("Premium sawal load nahi ho rahe! Free mode chal raha hai.");
            useFreeQuestions();
        }
    } else {
        useFreeQuestions();
    }
}

function useFreeQuestions() {
    console.log("🆓 10 Free questions loading...");
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:", options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" }, correct: "DCBA" },
        { question: "इन रंगों को इंद्रधनुष के क्रम में लगाएं (नीचे से ऊपर):", options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" }, correct: "CDAB" },
        { question: "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" },
        { question: "इन फिल्मों को उनके रिलीज वर्ष के अनुसार पुराने से नए क्रम में लगाएं:", options: { A: "दंगल", B: "शोले", C: "लगान", D: "बाहुबली" }, correct: "BCAD" },
        { question: "इन शहरों को उनकी जनसंख्या के हिसाब से घटते क्रम में लगाएं:", options: { A: "मुंबई", B: "दिल्ली", C: "बेंगलुरु", D: "चेन्नई" }, correct: "BACD" },
        { question: "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:", options: { A: "पृथ्वी", B: "बुध", C: "मंगल", D: "शुक्र" }, correct: "BDAC" },
        { question: "इन केबीसी पड़ावों को उनकी राशि के हिसाब से बढ़ते क्रम में लगाएं:", options: { A: "10,000", B: "1,60,000", C: "5,000", D: "3,20,000" }, correct: "CABD" },
        { question: "इन त्योहारों को कैलेंडर वर्ष में आने वाले क्रम में लगाएं:", options: { A: "होली", B: "दीवाली", C: "रक्षा बंधन", D: "गणेश चतुर्थी" }, correct: "ACDB" }
    ];

    currentQuestionsPool = freeQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        alert("10 मुफ्त सवाल पूरे हो चुके! Silver/Gold/Platinum प्लान लें।");
        window.location.href = "https://kbc-fff-2026-27.vercel.app/";
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सभी सवाल खत्म! होम जा रहे हैं।");
        window.location.href = "https://kbc-fff-2026-27.vercel.app/";
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSequence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    for (let key in currentQuestion.options) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.addEventListener("click", () => selectOption(key));
        optionsContainer.appendChild(btn);
    }

    bgMusic.play().catch(() => {});
    startTimer();
}

// Baaki functions same rakhna (selectOption, checkSequence, startTimer, etc.)
// Neeche wahi paste kar do jo pehle tha (main nahi badla)

function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById("btn-" + key);
        if (btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
    }
}

function checkSequence() {
    if (timerId) clearInterval(timerId);
    bgMusic.pause(); 
    clockSound.pause();
    lockSound.play().catch(() => {});

    const resultPara = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

function startTimer() {
    if (timerId) clearInterval(timerId);
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});

    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence();
        }
    }, 1000);
}
