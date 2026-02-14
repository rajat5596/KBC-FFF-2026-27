// ऑडियो फाइल्स लोड करना (आपके audio फोल्डर के हिसाब से)
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = new Audio('audio/wrong.mp3');

let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};

// 1. गेम शुरू करना
window.onload = function() {
    loadNewQuestion();
};

function loadNewQuestion() {
    // question.js से रैंडम सवाल उठाना
    const randomIndex = Math.floor(Math.random() * fffQuestions.length);
    currentQuestion = fffQuestions[randomIndex];
    
    userSequence = "";
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.play();
    startTimer();
}

function startTimer() {
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
        btn.style.background = "gold";
        btn.style.color = "black";
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play();

    setTimeout(() => {
        if (userSequence === currentQuestion.correct) {
            correctSound.play();
            document.getElementById('result').innerText = "सही जवाब!";
        } else {
            wrongSound.play();
            document.getElementById('result').innerText = "गलत! सही क्रम: " + currentQuestion.correct;
        }
    }, 1000);
}
