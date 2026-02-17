// --- Audio Files (Puraane path ke hisaab se) ---
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

// --- Logic: Page load hone par sabse pehle sawal ready karna ---
window.onload = function() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
                const userData = snapshot.val();
                
                if (userData && userData.plan) {
                    userPlan = userData.plan;
                    // Check karein kahin plan expire to nahi ho gaya
                    if (userData.expiry && new Date() > new Date(userData.expiry)) {
                        userPlan = 'free';
                    }
                }
            } catch (err) {
                console.error("Firebase data error:", err);
            }
        }
        // Plan check karne ke baad sawal load karein
        await loadQuestionsByPlan();
    });
};

// --- Sawalon ko load aur Shuffle (Phentna) karne ka logic ---
async function loadQuestionsByPlan() {
    let fileName = ''; 
    
    // Aapke GitHub filenames ke hisaab se
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json';

    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            let data = await response.json();
            // Sawalon ko shuffle karein taaki repeat na hon
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            console.error("Premium file load failed:", e);
            loadFreeQuestions();
        }
    } else {
        loadFreeQuestions();
    }
}

// Free questions load karne ka function
function loadFreeQuestions() {
    if (typeof fffQuestions !== 'undefined') {
        // Free sawalon ko bhi shuffle karein
        currentQuestionsPool = fffQuestions.sort(() => Math.random() - 0.5);
        loadNewQuestion();
    }
}

// --- Naya Sawal dikhane ka function ---
function loadNewQuestion() {
    // 10 sawal ki limit check (Sirf free users ke liye)
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    // Agar pool khali ho jaye (Sare sawal khatm ho jayein)
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("Sawal khatm ho gaye hain! Kripya dobara koshish karein.");
        window.location.href = "index.html";
        return;
    }

    // .shift() istemal karne se pehla sawal pool se nikal jayega aur dobara nahi aayega
    currentQuestion = currentQuestionsPool.shift(); 
    
    // UI Reset
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

    // Audio Play
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("Audio blocked by browser"));
    startTimer();
}

// --- Timer Function ---
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

// --- Option Selection ---
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

// --- Answer Verification ---
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
    // 3.5 second baad naya sawal bina repeat hue
    setTimeout(loadNewQuestion, 3500);
}

// --- Limit Reached Popup ---
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    const msg = "मुफ्त प्रैक्टिस सीमा (10 सवाल) समाप्त!\n\nअनलिमिटेड प्रैक्टिस के लिए प्रीमियम प्लान चुनें।";
    if (confirm(msg)) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
