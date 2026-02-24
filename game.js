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

// --- 1. Plan aur Questions Load Karein ---
window.onload = function() {
    const selectedJson = localStorage.getItem('selectedJson');
    
    // Check karein ki user 'Practice' daba kar aaya hai ya 'Silver' button
    if (selectedJson && selectedJson !== 'free') {
        userPlan = selectedJson.split('_')[0]; 
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
    } catch (e) { useDefaultFreeQuestions(); }
}

function useDefaultFreeQuestions() {
    userPlan = 'free';
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण (Debut) के हिसाब se पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:", options: { A: "पृथ्वी", B: "बुध", C: "मंगल", D: "शुक्र" }, correct: "BDAC" }
    ];
    currentQuestionsPool = freeQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

// --- 2. Main Question Loader (Undefined aur 0,1,2,3 Fix) ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        alert("10 मुफ्त सवाल पूरे! प्रीमियम लें।");
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

    // Display Fix: Sawal aur Sahi Kram dhoondna
    const finalQText = currentQuestion.question || currentQuestion.q || "सवाल लोड नहीं हुआ";
    const finalAnswer = currentQuestion.correct || currentQuestion.answer || "";
    
    // Store it properly for checking
    currentQuestion.correct = finalAnswer;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = finalQText;
    document.getElementById('result').innerText = "";

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    // Options Fix: A, B, C, D dikhane ke liye
    for (let key in currentQuestion.options) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        
        // Agar key '0' hai toh use 'A' dikhayein, '1' hai toh 'B'
        let displayKey = key;
        if(key === "0") displayKey = "A";
        else if(key === "1") displayKey = "B";
        else if(key === "2") displayKey = "C";
        else if(key === "3") displayKey = "D";

        btn.innerHTML = displayKey + ": " + currentQuestion.options[key];
        btn.addEventListener("click", () => selectOption(key));
        optionsContainer.appendChild(btn);
    }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

// --- 3. Result Check (Sahi Kram Fix) ---
function checkSequence() {
    if (timerId) clearInterval(timerId);
    bgMusic.pause(); 
    clockSound.pause();
    lockSound.play().catch(() => {});

    const resultPara = document.getElementById('result');
    
    // Sahi kram ko display karne ke liye
    let correctText = currentQuestion.correct;
    // Agar kram numbers mein hai (0123) toh use ABCD mein badlein
    correctText = correctText.replace(/0/g, 'A').replace(/1/g, 'B').replace(/2/g, 'C').replace(/3/g, 'D');

    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + correctText;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

// Timer aur SelectOption functions purane hi rahenge...
function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById("btn-" + key);
        if (btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            let displayNum = userSequence.length;
            btn.innerHTML += ` [${displayNum}]`;
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
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence();
        }
    }, 1000);
        }
