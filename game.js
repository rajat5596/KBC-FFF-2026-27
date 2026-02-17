// --- Audio Files (Safe & Sound) ---
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

// --- Logic: Page load hone par sawal dikhana ---
window.onload = function() {
    // Sabse pehle free questions load kar dete hain
    if (typeof fffQuestions !== 'undefined') {
        currentQuestionsPool = fffQuestions;
        loadNewQuestion();
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
                const userData = snapshot.val();
                
                if (userData && userData.plan) {
                    userPlan = userData.plan;
                    
                    // Plan Expire ho gaya ho to wapas free kar dein
                    if (userData.expiry && new Date() > new Date(userData.expiry)) {
                        userPlan = 'free';
                    }
                    
                    // Agar user premium hai to uska pool update karein
                    if (userPlan !== 'free') {
                        await loadQuestionsByPlan();
                    }
                }
            } catch (err) {
                console.error("Firebase error:", err);
            }
        }
    });
};

// --- Aapki GitHub Files ke hisaab se files load karna ---
async function loadQuestionsByPlan() {
    let fileName = ''; 
    
    // Aapke GitHub ke filenames yahan set hain
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json'; // Bina .json ke

    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            const data = await response.json();
            if (data && data.length > 0) {
                currentQuestionsPool = data;
                loadNewQuestion(); // Naye pool ke saath reload
            }
        } catch (e) {
            console.error("File load error:", e);
        }
    }
}

function loadNewQuestion() {
    // 10 sawal ki limit check
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) return;

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
    bgMusic.play().catch(e => {});
    startTimer();
}

// --- Standard Game Functions ---
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
        resultPara.innerText = "Adbhut! Sahi jawab.";
    } else {
        wrongSound.play();
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "Galat! Sahi kram: " + currentQuestion.correct;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    const msg = "Muft practice khatm! Unlimited premium sawalon ke liye OK dabayein.";
    if (confirm(msg)) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
