
// 1. सवाल (इन्हें आप question.js में भी रख सकते हैं, पर यहाँ भी चलेंगे)
const fffQuestions = [
    {
        question: "इन ऐतिहासिक घटनाओं को उनके होने वाले वर्ष के अनुसार पहले से बाद के क्रम में लगाएं:",
        options: { A: "दांडी मार्च", B: "भारत छोड़ो आंदोलन", C: "जलियांवाला बाग", D: "चंपारण सत्याग्रह" },
        correct: "DCAB"
    },
    {
        question: "इन नदियों को भारत में उनकी लंबाई के अनुसार लंबी से छोटी के क्रम में लगाएं:",
        options: { A: "यमुना", B: "गंगा", C: "गोदावरी", D: "नर्मदा" },
        correct: "BCAD"
    }
];

// 2. ऑडियो फाइल्स (आपके audio फोल्डर के हिसाब से)
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = new Audio('audio/wrong.mp3');

let currentQuestion = {};
let userSequence = "";
let timeLeft = 20;
let timerId;

window.onload = function() {
    loadNewQuestion();
};

function loadNewQuestion() {
    const randomIndex = Math.floor(Math.random() * fffQuestions.length);
    currentQuestion = fffQuestions[randomIndex];
    
    userSequence = "";
    timeLeft = 20;
    document.getElementById('result').innerText = "";
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.loop = true;
    bgMusic.play();
    startTimer();
}

function startTimer() {
    clockSound.loop = true;
    clockSound.play();
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence();
        }
    }, 1000);
}

function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        btn.style.background = "linear-gradient(to bottom, #FFD700, #b8860b)";
        btn.style.color = "black";
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play();

    const resultPara = document.getElementById('result');

    if (userSequence === currentQuestion.correct) {
        correctSound.play();
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play();
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
    }

    setTimeout(() => {
        if(confirm("अगला सवाल?")) {
            loadNewQuestion();
        } else {
            window.location.href = "index.html";
        }
    }, 4000);
}
