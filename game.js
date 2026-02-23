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
    if (typeof firebase === 'undefined') {
        console.log("Firebase लोड नहीं हुआ");
        useDefaultFreeQuestions();
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // नंबर को क्लीन करें: +919889904191 -> 9889904191
            const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
            console.log("📱 लॉग इन नंबर:", cleanPhone);

            try {
                // सही पाथ: users/9889904191
                const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                const userData = snapshot.val();
                
                if (userData && userData.plan && userData.status === 'active') {
                    const expiryDate = new Date(userData.expiry);
                    if (expiryDate > new Date()) {
                        userPlan = userData.plan.toLowerCase().trim();
                        console.log("✅ प्रीमियम एक्टिव:", userPlan);
                        
                        // UI अपडेट करें (अगर एलिमेंट है)
                        const planDisplay = document.getElementById('user-plan-display');
                        if(planDisplay) planDisplay.innerHTML = `💎 ${userPlan.toUpperCase()} प्लान`;
                    }
                }
            } catch (error) {
                console.log("Firebase error:", error);
            }
        } else {
            window.location.href = "index.html";
            return;
        }
        // सवालों को लोड करें
        loadFinalQuestions();
    });
};

// --- 2. सवालों को लोड करना ---
async function loadFinalQuestions() {
    let fileName = ''; 
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error();
            let data = await response.json();
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
    // window.fffQuestions चेक करें (question.js से)
    const questions = window.fffQuestions || (typeof fffQuestions !== 'undefined' ? fffQuestions : null);
    
    if (questions && questions.length > 0) {
        currentQuestionsPool = [...questions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        console.log("⏳ सवाल लोड हो रहे हैं...");
        setTimeout(useDefaultFreeQuestions, 1000);
    }
}

// --- 3. नया सवाल और गेम लॉजिक ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सवाल खत्म हो गए हैं!");
        window.location.href = "index.html";
        return;
    }

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
    lockSound.play().catch(e => {});

    const resultPara = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(e => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(e => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}

function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/15geGvLS_conv"; 
    if (confirm("10 मुफ्त सवाल पूरे! आगे के लिए प्रीमियम लें?")) {
        window.top.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
