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
    // पहले चेक करो कि Firebase लोड हुआ या नहीं
    if (typeof firebase === 'undefined') {
        console.log("Firebase लोड नहीं हुआ, फ्री मोड में चल रहे हैं");
        setTimeout(() => {
            useDefaultFreeQuestions();
        }, 500);
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
                const userData = snapshot.val();
                if (userData && userData.plan) {
                    userPlan = userData.plan;
                    if (userData.expiry && new Date() > new Date(userData.expiry)) {
                        userPlan = 'free';
                    }
                }
            } catch (error) {
                console.log("Firebase error, फ्री मोड में जा रहे हैं", error);
                userPlan = 'free';
            }
        }
        // प्लान चेक करने के बाद सवाल लोड करना
        loadFinalQuestions();
    });
};

// --- 2. सवालों को लोड और SHUFFLE करना ---
async function loadFinalQuestions() {
    let fileName = ''; 
    
    // प्रीमियम प्लान के लिए फाइल नाम
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json'; // यहाँ सही किया

    // प्रीमियम यूजर के लिए
    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error('फाइल नहीं मिली');
            }
            let data = await response.json();
            // सवालों को फेंटना
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            console.log("प्रीमियम सवाल नहीं मिले, फ्री लोड कर रहे हैं");
            useDefaultFreeQuestions();
        }
    } else {
        // फ्री यूजर के लिए
        useDefaultFreeQuestions();
    }
}

// फ्री सवाल लोड करने का फंक्शन
function useDefaultFreeQuestions() {
    // चेक करो कि fffQuestions मौजूद है या नहीं
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        // फ्री सवालों को फेंटना
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        // अगर नहीं मिले तो 500ms बाद फिर कोशिश करो
        console.log("fffQuestions नहीं मिला, फिर कोशिश कर रहे हैं...");
        setTimeout(useDefaultFreeQuestions, 500);
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    // फ्री यूजर के लिए 10 सवालों की लिमिट
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    // चेक करो कि सवाल बाकी हैं या नहीं
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        // अगर सवाल खत्म हो गए तो फिर से लोड करो
        if (userPlan === 'free') {
            useDefaultFreeQuestions();
        } else {
            alert("सारे सवाल खत्म हो गए हैं! पेज रिफ्रेश करें।");
        }
        return;
    }

    // नया सवाल लोड करो
    currentQuestion = currentQuestionsPool.shift(); 
    
    // UI अपडेट करो
    userSequence = "";
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    // ऑप्शन बटन बनाओ
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    // बैकग्राउंड म्यूजिक चलाओ
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("ऑडियो नहीं चल सका:", e));
    
    // टाइमर शुरू करो
    startTimer();
}

// --- टाइमर शुरू करना ---
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

// --- ऑप्शन सिलेक्ट करना ---
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

// --- जवाब चेक करना ---
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
    
    // अगला सवाल 3.5 सेकंड बाद
    setTimeout(loadNewQuestion, 3500);
}

// --- लिमिट खत्म होने पर ---
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    
    if (confirm("10 मुफ्त सवाल पूरे! आगे के लिए प्रीमियम लें?")) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
// ===== PREMIUM CHECK - REAL TIME (Webhook ke baad yeh kaam karega) =====
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const phone = user.phoneNumber;   // +919889904191 aayega

        firebase.database().ref('users/' + phone).on('value', (snapshot) => {
            const data = snapshot.val();
            console.log("🔥 Firebase se naya data aaya:", data);   // Console mein dekhne ke liye

            if (data && data.plan && data.plan !== 'free') {
                const expiryDate = new Date(data.expiry);
                if (expiryDate > new Date()) {
                    // PREMIUM ACTIVE!
                    userPlan = data.plan;
                    console.log("✅ Premium Active:", userPlan);

                    // UI mein show kar do
                    document.getElementById('welcome-msg').innerText = 
                        "स्वागत है, " + name + " (" + userPlan.toUpperCase() + ")";

                    // Premium questions load karo
                    loadPremiumQuestions(userPlan);   // agar yeh function hai to call kar

                    // Limit wala message hide kar do
                    document.getElementById('limit-message') && 
                        (document.getElementById('limit-message').style.display = 'none');
                }
            }
        });
    }
});
