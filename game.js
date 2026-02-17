// --- Purane Audio Files ---
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

// --- Sudhara hua logic: Page load hote hi check karein ---
window.onload = function() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Agar user login hai, to plan check karein
            const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
            const userData = snapshot.val();
            
            if (userData && userData.plan) {
                userPlan = userData.plan;
                if (userData.expiry && new Date() > new Date(userData.expiry)) {
                    userPlan = 'free';
                }
            }
        } else {
            // Agar user login nahi hai, to plan 'free' hi rahega
            userPlan = 'free';
        }
        // Ab sawal load karein
        await loadQuestionsByPlan();
    });
};

// --- Sawal load karne ka sahi tarika ---
async function loadQuestionsByPlan() {
    let fileName = ''; 
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json';

    // Agar premium plan hai to JSON load karein
    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            currentQuestionsPool = await response.json();
            loadNewQuestion();
        } catch (e) {
            console.error("Premium file error:", e);
            useFreeQuestions();
        }
    } else {
        useFreeQuestions();
    }
}

// Free questions (question.js) load karne ke liye alag function
function useFreeQuestions() {
    if (typeof fffQuestions !== 'undefined') {
        currentQuestionsPool = fffQuestions;
        loadNewQuestion();
    } else {
        console.error("question.js load nahi ho paayi!");
    }
}

function loadNewQuestion() {
    // 10 sawal ki limit check
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("Sawal load ho rahe hain, kripya intezar karein...");
        return;
    }

    const randomIndex = Math.floor(Math.random() * currentQuestionsPool.length);
    currentQuestion = currentQuestionsPool[randomIndex];
    
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

    bgMusic.currentTime = 0;
    bgMusic.play();
    startTimer();
}

// --- Baaki saare function (startTimer, selectOption, checkSequence, handleLimitReached) ---
// Inko waisa hi rehne dein jaisa upar wale code mein tha

function startTimer() {
    clockSound.currentTime = 0;
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

    const resultPara = document.getElementById('result');
    
    if (userSequence === currentQuestion.correct) {
        correctSound.play();
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "Adbhut! Sahi jawab.";
    } else {
        wrongSound.play();
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "Galat! Sahi kram: " + currentQuestion.correct;
    }

    questionsPlayed++;

    setTimeout(() => {
        loadNewQuestion();
    }, 3500);
}

function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    const msg = "Badhai ho! Aapne 10 sawalon ki muft practice poori kar li hai.\n\nPractice jari rakhne ke liye abhi Premium lein!";

    if (confirm(msg)) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
