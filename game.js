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

// --- 1. पेज लोड होते ही डेटा तैयार करना ---
window.onload = function() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
            const userData = snapshot.val();
            if (userData && userData.plan) {
                userPlan = userData.plan;
                if (userData.expiry && new Date() > new Date(userData.expiry)) {
                    userPlan = 'free';
                }
            }
        }
        // प्लान चेक करने के बाद सवाल लोड करना
        loadFinalQuestions();
    });
};

// --- 2. सवालों को लोड और 'SHUFFLE' करना (ताकि रिपीट न हों) ---
async function loadFinalQuestions() {
    let fileName = ''; 
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json';

    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            let data = await response.json();
            // यहाँ सवालों को फेंटा जा रहा है (Shuffle)
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            useDefaultFreeQuestions();
        }
    } else {
        useDefaultFreeQuestions();
    }
}

function useDefaultFreeQuestions() {
    // अगर question.js फाइल लोड हो गई है
    if (typeof fffQuestions !== 'undefined') {
        // फ्री सवालों को भी फेंट दिया (Shuffle)
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        // अगर लोड नहीं हुई तो आधा सेकंड इंतज़ार करके फिर कोशिश करेगा
        setTimeout(useDefaultFreeQuestions, 500);
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सारे सवाल खत्म हो गए हैं! पेज रिफ्रेश करें।");
        return;
    }

    // .shift() का मतलब है लिस्ट का पहला सवाल निकालो और उसे लिस्ट से हटा दो (No Repeat)
    currentQuestion = currentQuestionsPool.shift(); 
    
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
    bgMusic.play().catch(e => {});
    startTimer();
}

// --- बाकी गेम के फंक्शन ---
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
    if (confirm("10 मुफ्त सवाल पूरे! आगे के लिए प्रीमियम लें?")) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
