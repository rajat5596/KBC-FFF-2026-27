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
    // 1. LocalStorage se plan aur file pakadna
    const selectedJson = localStorage.getItem('selectedJson') || 'free_questions.json';
    
    // Yahan fix hai: Agar 'free' word hai toh userPlan 'free' rahega
    if (selectedJson.includes('free')) {
        userPlan = 'free';
    } else {
        userPlan = 'silver';
    }

    console.log("Plan Detected:", userPlan, "File:", selectedJson);
    loadFinalQuestions(selectedJson);
};

async function loadFinalQuestions(fileName) {
    try {
        const response = await fetch(fileName + "?v=" + Date.now());
        if (!response.ok) throw new Error();
        let data = await response.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } catch (e) { 
        console.error("JSON Error");
        // Agar file na mile toh index par wapas bhej do
        window.location.href = "index.html";
    }
}

function loadNewQuestion() {
    // 2. Limit Check (Sirf Free ke liye)
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
    userSequence = ""; // Reset sequence
    timeLeft = 20;

    // Data Mapping Fix
    const qText = currentQuestion.question || currentQuestion.q || "सवाल लोड नहीं हुआ";
    const qAns = currentQuestion.correct || currentQuestion.answer || "";
    currentQuestion.correct = qAns.toString().toUpperCase();

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = qText;
    document.getElementById('result').innerText = "";

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = "";

    // 0,1,2,3 ko A,B,C,D mein map karne ka paka tarika
    const keyMap = { "0": "A", "1": "B", "2": "C", "3": "D", "A": "A", "B": "B", "C": "C", "D": "D" };

    for (let key in currentQuestion.options) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.id = "btn-" + key;
        let label = keyMap[key] || key;
        btn.innerHTML = `${label}: ${currentQuestion.options[key]}`;
        btn.onclick = function() { selectOption(key); };
        optionsContainer.appendChild(btn);
    }

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

function selectOption(key) {
    // Bina touch kiye lock na ho, isliye sequence check
    if (!userSequence.includes(key) && userSequence.length < 4) {
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
    // Bina option dabaye lock karne par "Pehle option chunein" alert
    if (userSequence.length === 0 && timeLeft > 0) {
        alert("कृपया पहले सही क्रम चुनें!");
        return;
    }

    if (timerId) clearInterval(timerId);
    bgMusic.pause(); clockSound.pause();
    lockSound.play().catch(() => {});

    const resultPara = document.getElementById('result');
    
    // Kram Convert Fix: userSequence aur correct dono ko ABCD mein badalna
    const map = { "0": "A", "1": "B", "2": "C", "3": "D", "A": "A", "B": "B", "C": "C", "D": "D" };
    
    let userFinal = "";
    for(let char of userSequence) { userFinal += map[char] || char; }

    let correctFinal = "";
    for(let char of currentQuestion.correct) { correctFinal += map[char] || char; }

    if (userFinal === correctFinal && userFinal !== "") {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        // Yahan fix hai: Ab sahi kram dikhayega
        resultPara.innerText = "गलत! सही क्रम: " + correctFinal;
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
        if (timeLeft <= 0) { clearInterval(timerId); checkSequence(); }
    }, 1000);
}
