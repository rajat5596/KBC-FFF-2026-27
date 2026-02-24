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
    // 1. URL ya LocalStorage se plan check karna
    const selectedJson = localStorage.getItem('selectedJson') || 'free_questions.json';
    
    // Agar selectedJson 'free' hai, toh hum free wali file load karenge
    let fileToLoad = selectedJson;
    if (selectedJson === 'free' || selectedJson === 'question.json') {
        fileToLoad = 'free_questions.json'; // Is naam ki file GitHub par banaiye
        userPlan = 'free';
    } else {
        userPlan = 'silver'; // Ya gold/platinum jo bhi ho
    }

    console.log("Loading Plan:", userPlan, "File:", fileToLoad);
    loadFinalQuestions(fileToLoad);
};

async function loadFinalQuestions(fileName) {
    try {
        const response = await fetch(fileName + "?v=" + Date.now());
        if (!response.ok) throw new Error();
        let data = await response.json();
        
        // Data Load Fix: 500 sawal ya 10 sawal
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } catch (e) { 
        console.error("JSON Error, using JS fallback");
        useDefaultFallback(); // Agar file nahi mili toh game.js ke sawal
    }
}

// 2. Agar koi bhi JSON load nahi hui, toh ye 10 sawal chalenge
function useDefaultFallback() {
    userPlan = 'free';
    const fallbackQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" }
    ];
    currentQuestionsPool = fallbackQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    // 3. Limit Check: Free user ko 10 ke baad rokna
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

    // Answer Mapping Fix: Taaki "Undefined" na aaye
    const qText = currentQuestion.question || currentQuestion.q || "Sawal load nahi hua";
    const qAns = currentQuestion.correct || currentQuestion.answer || "";
    currentQuestion.correct = qAns.toString().toUpperCase();

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = qText;
    document.getElementById('result').innerText = "";

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    // Label Fix: 0,1,2,3 ko A,B,C,D banana
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

function checkSequence() {
    if (timerId) clearInterval(timerId);
    bgMusic.pause(); clockSound.pause();
    lockSound.play().catch(() => {});

    const resultPara = document.getElementById('result');
    
    // Result Calculation Fix: Dono ko A,B,C,D mein badal kar compare karna
    let userStr = userSequence.replace(/0/g, 'A').replace(/1/g, 'B').replace(/2/g, 'C').replace(/3/g, 'D');
    let correctStr = currentQuestion.correct.replace(/0/g, 'A').replace(/1/g, 'B').replace(/2/g, 'C').replace(/3/g, 'D');

    if (userStr === correctStr) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + correctStr; // Ab yahan ABCD likhkar aayega
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

// selectOption aur startTimer functions pehle jaise hi rahenge
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
function startTimer() {
    if (timerId) clearInterval(timerId);
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) { clearInterval(timerId); checkSequence(); }
    }, 1000);
}
