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

window.onload = function() {
    // 1. Pehle dekho user ne kaunsa button dabaya hai
    const selectedJson = localStorage.getItem('selectedJson') || 'free';
    userPlan = localStorage.getItem('forcePlan') || 'free';

    console.log("Plan:", userPlan, "Loading File:", selectedJson);

    if (selectedJson !== 'free') {
        loadFinalQuestions(selectedJson);
    } else {
        useDefaultFreeQuestions();
    }
};

async function loadFinalQuestions(fileName) {
    try {
        const response = await fetch(fileName + "?v=" + Date.now());
        if (!response.ok) throw new Error();
        let data = await response.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } catch (e) { 
        console.error("JSON Error, using Free questions");
        useDefaultFreeQuestions(); 
    }
}

function useDefaultFreeQuestions() {
    userPlan = 'free';
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन प्रधानमंत्रियों को कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" }
    ];
    currentQuestionsPool = freeQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    // Limit Check for Free Users
    if (userPlan === 'free' && questionsPlayed >= 10) {
        alert("10 मुफ्त सवाल पूरे! सिल्वर प्लान लें।");
        window.location.href = "index.html";
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सारे सवाल खत्म हो गए!");
        window.location.href = "index.html";
        return;
    }

    currentQuestion = currentQuestionsPool.shift(); 
    userSequence = "";
    timeLeft = 20;

    // Fix: JSON keys handle karna (q, question, answer, correct)
    const qText = currentQuestion.question || currentQuestion.q || "Sawal load nahi hua";
    const qAns = currentQuestion.correct || currentQuestion.answer || "";
    currentQuestion.correct = qAns.toString().toUpperCase(); 

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = qText;
    document.getElementById('result').innerText = "";

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    // Options Mapping (0,1,2,3 ko A,B,C,D banana)
    const keyMap = { "0": "A", "1": "B", "2": "C", "3": "D", "A": "A", "B": "B", "C": "C", "D": "D" };

    for (let key in currentQuestion.options) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        
        let label = keyMap[key] || key;
        btn.innerHTML = `${label}: ${currentQuestion.options[key]}`;
        
        btn.addEventListener("click", () => selectOption(key));
        optionsContainer.appendChild(btn);
    }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

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
    
    // Result Fix: User sequence aur Correct answer ko compare karna
    let userStr = userSequence.replace(/0/g, 'A').replace(/1/g, 'B').replace(/2/g, 'C').replace(/3/g, 'D');
    let correctStr = currentQuestion.correct.replace(/0/g, 'A').replace(/1/g, 'B').replace(/2/g, 'C').replace(/3/g, 'D');

    if (userStr === correctStr) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + correctStr;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
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
            checkSequence();
        }
    }, 1000);
}
