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

// --- 1. सबसे पहले पेज लोड होने पर डेटा चेक करें ---
window.onload = function() {
    console.log("App loading...");
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User logged in:", user.phoneNumber);
            const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
            const userData = snapshot.val();
            if (userData && userData.plan) {
                userPlan = userData.plan;
                if (userData.expiry && new Date() > new Date(userData.expiry)) {
                    userPlan = 'free';
                }
            }
        }
        // प्लान पता चलने के बाद फाइल लोड करें
        initGame();
    });
};

// --- 2. सही फाइल से डेटा उठाना ---
async function initGame() {
    let fileName = ''; 
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json';

    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            const data = await response.json();
            // SHUFFLE: सवालों को फेंटना (ताकि रिपीट न हों)
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            console.log("Premium questions loaded");
            loadNewQuestion();
        } catch (e) {
            console.error("JSON load error, falling back to free");
            setupFreeQuestions();
        }
    } else {
        setupFreeQuestions();
    }
}

function setupFreeQuestions() {
    // यहाँ चेक करें कि fffQuestions (question.js से) मौजूद है या नहीं
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        console.log("Free questions loaded");
        loadNewQuestion();
    } else {
        // अगर 2 सेकंड बाद भी लोड न हो, तो फिर से कोशिश करें
        console.log("Waiting for question.js...");
        setTimeout(setupFreeQuestions, 1000);
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    // फ्री यूजर लिमिट
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सारे सवाल खत्म हो गए हैं!");
        window.location.href = "index.html";
        return;
    }

    // .shift() से पहला सवाल बाहर निकालें (ताकि दोबारा न आए)
    currentQuestion = currentQuestionsPool.shift(); 
    
    userSequence = "";
    timeLeft = 20;
    
    // स्क्रीन पर डेटा डालना
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
    bgMusic.play().catch(e => console.log("Music click required"));
    startTimer();
}

// --- बाकी जरूरी फंक्शन (टाइमर, चेकिंग आदि) ---

function startTimer() {
    if (timerId) clearInterval(timerId);
    clockSound.currentTime = 0;
    clockSound.play().catch(e => {});
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
        if(btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
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

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    if (confirm("10 सवाल पूरे! प्रीमियम प्रैक्टिस शुरू करें?")) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
