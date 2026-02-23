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

window.onload = function() {
    console.log("Game page लोड हो गई। Plan चेक शुरू...");

    // Firebase से plan लोड करो (अगर login है)
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
                try {
                    const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                    const userData = snapshot.val();
                    if (userData && userData.status === 'active') {
                        const expiryDate = new Date(userData.expiry);
                        if (expiryDate > new Date()) {
                            userPlan = userData.plan.toLowerCase().trim();
                            console.log("Firebase से premium plan मिला:", userPlan);
                        }
                    }
                } catch (error) {
                    console.log("DB Error:", error);
                }
            } else {
                console.log("User नहीं लॉगिन - free मोड");
            }
            loadQuestions(); // plan set होने के बाद सवाल लोड
        });
    } else {
        console.log("Firebase नहीं मिला - localStorage चेक");
        // localStorage fallback
        userPlan = localStorage.getItem('user_plan_type') || 'free';
        userPlan = userPlan.toLowerCase().trim();
        console.log("localStorage से plan:", userPlan);
        loadQuestions();
    }
};

function loadQuestions() {
    console.log("सवाल लोड कर रहा हूँ - current plan:", userPlan);

    let fileName = '';
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    if (fileName) {
        console.log("Premium JSON लोड: " + fileName);
        fetch(fileName + "?v=" + Date.now())
            .then(response => {
                console.log("Fetch response status:", response.status);
                if (!response.ok) throw new Error("JSON नहीं मिला");
                return response.json();
            })
            .then(data => {
                if (data && data.length > 0) {
                    currentQuestionsPool = data.sort(() => Math.random() - 0.5);
                    loadNewQuestion();
                    console.log("Premium सवाल लोड हो गए! कुल: " + data.length);
                } else {
                    console.log("JSON खाली - free fallback");
                    loadFreeFallback();
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                loadFreeFallback();
            });
    } else {
        console.log("Free plan - fallback सवाल");
        loadFreeFallback();
    }
}

function loadFreeFallback() {
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण (Debut) के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:", options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" }, correct: "DCBA" },
        { question: "इन रंगों को इंद्रधनुष (Rainbow) के क्रम में लगाएं (नीचे से ऊपर):", options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" }, correct: "CDAB" },
        { question: "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" },
        { question: "इन फिल्मों को उनके रिलीज वर्ष के अनुसार पुराने से नए क्रम में लगाएं:", options: { A: "दंगल", B: "शोले", C: "लगान", D: "बाहुबली" }, correct: "BCAD" },
        { question: "इन शहरों को उनकी जनसंख्या के हिसाब से घटते क्रम (ज्यादा से कम) में लगाएं:", options: { A: "मुंबई", B: "दिल्ली", C: "बेंगलुरु", D: "चेन्नई" }, correct: "BACD" },
        { question: "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:", options: { A: "पृथ्वी", B: "बुध", C: "मंगल", D: "शुक्र" }, correct: "BDAC" },
        { question: "इन केबीसी पड़ावों (Levels) को उनकी राशि के हिसाब से बढ़ते क्रम में लगाएं:", options: { A: "10,000", B: "1,60,000", C: "5,000", D: "3,20,000" }, correct: "CABD" },
        { question: "इन त्योहारों को कैलेंडर वर्ष में आने वाले क्रम में लगाएं:", options: { A: "होली", B: "दीवाली", C: "रक्षा बंधन", D: "गणेश चतुर्थी" }, correct: "ACDB" }
    ];

    currentQuestionsPool = freeQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();
    console.log("Free 10 सवाल लोड हो गए");
}

// loadNewQuestion में premium check
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        if (typeof handleLimitReached === 'function') {
            handleLimitReached();
        } else {
            alert("10 मुफ्त सवाल पूरे! प्रीमियम लें।");
            window.open("https://rzp.io/rzp/I5geGyLS", '_self');
        }
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        document.getElementById('question-text').innerHTML = "सारे सवाल खत्म! प्रीमियम लें या होम जाएँ।";
        document.getElementById('options-container').innerHTML = "";
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
        optionsHTML += `<button class="option-btn" id="btn-\( {key}" onclick="selectOption(' \){key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

// बाकी सारे functions (startTimer, selectOption, checkSequence, selectOption आदि) वैसा ही रहने दो
