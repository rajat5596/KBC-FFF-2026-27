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
    // Firebase Load Check
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded!");
        useDefaultFreeQuestions();
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // क्लीन फोन नंबर (9889904191 फॉर्मेट)
            const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
            console.log("✅ लॉग इन यूजर:", cleanPhone);
            
            try {
                const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                const userData = snapshot.val();
                
                if (userData && userData.status === "active") {
                    const expiryDate = new Date(userData.expiry);
                    if (expiryDate > new Date()) {
                        userPlan = userData.plan.toLowerCase().trim();
                        showUserPlan(userPlan, expiryDate);
                    } else {
                        handlePlanExpiry(cleanPhone);
                    }
                } else {
                    userPlan = 'free';
                    showUserPlan('free');
                }
            } catch (error) {
                console.error("Firebase Error:", error);
                userPlan = 'free';
            }
        } else {
            console.log("⚠️ No user session found");
            window.location.href = "index.html";
            return;
        }
        
        // प्लान लोड होने के बाद सवाल लोड करें
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
            if (!response.ok) throw new Error('File not found');
            let data = await response.json();
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            console.log("Paltback to free questions:", e);
            useDefaultFreeQuestions();
        }
    } else {
        useDefaultFreeQuestions();
    }
}

// फ्री सवाल लोड करने का फंक्शन (सबसे ज्यादा दिक्कत यहीं होती है)
function useDefaultFreeQuestions() {
    // ग्लोबल विंडो से डेटा उठाएं
    const questions = window.fffQuestions || fffQuestions; 
    
    if (questions && questions.length > 0) {
        currentQuestionsPool = [...questions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        console.error("fffQuestions array is empty or not found");
        // अगर डेटा नहीं मिला तो एक डमी सवाल दिखा दें ताकि गेम क्रैश न हो
        currentQuestionsPool = [{
            question: "भारत का राष्ट्रीय खेल क्या है?",
            options: {A:"क्रिकेट", B:"हॉकी", C:"फुटबॉल", D:"कबड्डी"},
            correct: "B"
        }];
        loadNewQuestion();
    }
}



// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("अभ्यास के लिए और सवाल जल्द ही जोड़े जायेंगे!");
        window.location.href = "index.html";
        return;
    }

    currentQuestion = currentQuestionsPool.shift(); 
    userSequence = "";
    timeLeft = 20;
    
    // UI Update
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            <span class="opt-key">${key}:</span> ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    resetAudioAndStartTimer();
}

function resetAudioAndStartTimer() {
    try {
        bgMusic.pause(); bgMusic.currentTime = 0;
        bgMusic.play().catch(()=> {});
    } catch(e) {}
    startTimer();
}

function startTimer() {
    if (timerId) clearInterval(timerId);
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
            btn.classList.add('selected');
            btn.innerHTML += ` <b style="color:white;">[${userSequence.length}]</b>`;
        }
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    
    const resultPara = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play();
        resultPara.innerHTML = "<span style='color:#00FF00'>अद्भुत! सही जवाब।</span>";
    } else {
        wrongSound.play();
        resultPara.innerHTML = `<span style='color:#FF4444'>गलत! सही क्रम: ${currentQuestion.correct}</span>`;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3000);
}

function handlePlanExpiry(phone) {
    userPlan = 'free';
    showUserPlan('expired');
    firebase.database().ref('users/' + phone).update({ status: 'expired' });
}

function handleLimitReached() {
    alert("🎯 आपके 10 फ्री सवाल खत्म हो गए हैं। आगे खेलने के लिए प्रीमियम प्लान लें।");
    window.location.href = "index.html";
}

function showUserPlan(plan, expiryDate) {
    let planDiv = document.getElementById('user-plan-display');
    if (!planDiv) return;
    
    let theme = { text: "फ्री यूजर", bg: "#27ae60" };
    if (plan === 'silver') theme = { text: "सिल्वर", bg: "linear-gradient(135deg, #C0C0C0, #707070)" };
    if (plan === 'gold') theme = { text: "गोल्ड", bg: "linear-gradient(135deg, #FFD700, #B8860B)" };
    if (plan === 'platinum') theme = { text: "प्लैटिनम", bg: "linear-gradient(135deg, #E5E4E2, #708090)" };
    if (plan === 'expired') theme = { text: "एक्सपायर", bg: "#e74c3c" };

    planDiv.style.background = theme.bg;
    planDiv.innerHTML = `<b>${theme.text}</b>`;
}
