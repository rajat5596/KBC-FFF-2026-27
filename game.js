// ऑडियो
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

// Page load hone par plan check + questions load
window.addEventListener('load', () => {
    console.log("Game शुरू...");

    // NEW: Practice mode (free) force karo
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'free') {
        userPlan = 'free';
        console.log("Practice/Free mode forced");
    } else {
        // Paid users ke liye normal localStorage se plan
        const savedPlan = localStorage.getItem('user_plan_type') || 'free';
        userPlan = savedPlan.toLowerCase().trim();
        console.log("Normal plan:", userPlan);
    }

    loadQuestions();
});

async function loadQuestions() {
    let fileName = 'free_questions.json';
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    try {
        console.log("Loading file:", fileName);
        const res = await fetch(fileName + '?v=' + Date.now());
        if (!res.ok) throw new Error('File issue: ' + res.status);
        
        let data = await res.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        console.log("Raw questions count:", currentQuestionsPool.length);

        // All Hindi format files (platinum/gold/silver) ke liye
        currentQuestionsPool = currentQuestionsPool.map(item => {
            // Flexible question key
            let questionText = (item['प्रश्न'] || item.q || item.question || '').trim();

            // Options - array
            let optionsArr = item['विकल्प'] || item.options || [];
            if (!Array.isArray(optionsArr)) optionsArr = [];

            // Correct - flexible key
            let correctAns = (item['उत्तर'] || item.a || item.correct || item.output || '').trim();

            if (!questionText || optionsArr.length < 3 || !correctAns) {
                console.warn("Skipped - missing/empty");
                return null;
            }

            const opts = {};
            optionsArr.forEach((opt, idx) => {
                if (opt && opt.trim()) opts[String.fromCharCode(65 + idx)] = opt.trim();
            });

            // Very loose matching for correct answer
            let cleanAns = correctAns.replace(/[\s,।;:'"()]+/g, ' ').trim().toLowerCase();
            let correctLetters = '';
            const ansWords = cleanAns.split(' ').filter(w => w.length > 2); // ignore small words like "का", "के"
            optionsArr.forEach((opt, idx) => {
                if (opt) {
                    let cleanOpt = opt.trim().toLowerCase().replace(/[\s,।;:'"()]+/g, ' ');
                    if (ansWords.some(word => cleanOpt.includes(word))) {
                        correctLetters += String.fromCharCode(65 + idx);
                    }
                }
            });

            if (correctLetters.length < correctAns.split(',').length) {
                correctLetters = 'ABCD'; // fallback if partial match
            }

            return {
                question: questionText,
                options: opts,
                correct: correctLetters
            };
        }).filter(q => q !== null && Object.keys(q.options).length >= 3);

        console.log("Valid questions:", currentQuestionsPool.length);

        if (currentQuestionsPool.length === 0) {
            console.error("No valid questions - likely match fail");
            alert("सवाल लोड नहीं हो रहे (matching problem)! Free मोड ट्राई करें।");
            loadFreeFallback();
        } else {
            loadNewQuestion();
        }

    } catch (err) {
        console.error("Error:", err.message);
        alert("फाइल लोड नहीं हो रही! Free मोड ट्राई करो।");
        loadFreeFallback();
    }
}
function loadFreeFallback() {
    // Hardcoded 10 free questions - ab Hindi format mein (प्रश्न, विकल्प array, उत्तर comma-separated)
    const freeQs = [
        {
            "प्रश्न": "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:",
            "विकल्प": ["15 अगस्त", "26 जनवरी", "2 अक्टूबर", "14 नवंबर"],
            "उत्तर": "26 जनवरी, 15 अगस्त, 2 अक्टूबर, 14 नवंबर"
        },
        {
            "प्रश्न": "इन क्रिकेट खिलाड़ियों को उनके पदार्पण के हिसाब से पुराने से नए क्रम में लगाएं:",
            "विकल्प": ["विराट कोहली", "एमएस धोनी", "सचिन तेंदुलकर", "शुभमन गिल"],
            "उत्तर": "सचिन तेंदुलकर, एमएस धोनी, विराट कोहली, शुभमन गिल"
        },
        {
            "प्रश्न": "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:",
            "विकल्प": ["इंस्टाग्राम", "फेसबुक", "व्हाट्सएप", "यूट्यूब"],
            "उत्तर": "यूट्यूब, व्हाट्सएप, फेसबुक, इंस्टाग्राम"
        },
        {
            "प्रश्न": "इन रंगों को इंद्रधनुष के क्रम में लगाएं (नीचे से ऊपर):",
            "विकल्प": ["पीला", "लाल", "बैंगनी", "हरा"],
            "उत्तर": "बैंगनी, हरा, पीला, लाल"
        },
        {
            "प्रश्न": "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:",
            "विकल्प": ["नरेन्द्र मोदी", "इन्दिरा गांधी", "जवाहरलाल नेहरू", "अटल बिहारी वाजपेयी"],
            "उत्तर": "जवाहरलाल नेहरू, इन्दिरा गांधी, अटल बिहारी वाजपेयी, नरेन्द्र मोदी"
        },
        {
            "प्रश्न": "इन फिल्मों को उनके रिलीज वर्ष के अनुसार पुराने से नए क्रम में लगाएं:",
            "विकल्प": ["दंगल", "शोले", "लगान", "बाहुबली"],
            "उत्तर": "शोले, लगान, दंगल, बाहुबली"
        },
        {
            "प्रश्न": "इन शहरों को उनकी जनसंख्या के हिसाब से घटते क्रम में लगाएं:",
            "विकल्प": ["मुंबई", "दिल्ली", "बेंगलुरु", "चेन्नई"],
            "उत्तर": "मुंबई, दिल्ली, बेंगलुरु, चेन्नई"
        },
        {
            "प्रश्न": "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:",
            "विकल्प": ["पृथ्वी", "बुध", "मंगल", "शुक्र"],
            "उत्तर": "बुध, शुक्र, पृथ्वी, मंगल"
        },
        {
            "प्रश्न": "इन केबीसी पड़ावों को उनकी राशि के हिसाब से बढ़ते क्रम में लगाएं:",
            "विकल्प": ["10,000", "1,60,000", "5,000", "3,20,000"],
            "उत्तर": "5,000, 10,000, 1,60,000, 3,20,000"
        },
        {
            "प्रश्न": "इन त्योहारों को कैलेंडर वर्ष में आने वाले क्रम में लगाएं:",
            "विकल्प": ["होली", "दीवाली", "रक्षा बंधन", "गणेश चतुर्थी"],
            "उत्तर": "होली, रक्षा बंधन, गणेश चतुर्थी, दीवाली"
        }
    ];

    currentQuestionsPool = freeQs.sort(() => Math.random() - 0.5);
    loadNewQuestion();
}

function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        alert("10 free सवाल खत्म! Upgrade करो।");
        window.location.href = "/";
        return;
    }
    if (currentQuestionsPool.length === 0) {
        alert("सभी सवाल खत्म!");
        window.location.href = "/";
        return;
    }

    currentQuestion = currentQuestionsPool.shift();
    userSeuence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question || "Question missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = "";

    Object.keys(currentQuestion.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = 'btn-' + key;
        btn.innerHTML = key + ": " + currentQuestion.options[key];
        btn.onclick = () => selectOption(key);
        optsDiv.appendChild(btn);
    });

    bgMusic.play().catch(e => {});
    startTimer();
}

function selectOption(key) {
    if (userSequence.includes(key)) return;
    userSequence += key;
    const btn = document.getElementById('btn-' + key);
    btn.style.background = 'gold';
    btn.style.color = 'black';
    btn.innerHTML += ` [${userSequence.length}]`;
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play().catch(e => {});

    const result = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(e => {});
        result.style.color = 'lime';
        result.innerText = 'सही जवाब! 🎉';
    } else {
        wrongSound.play().catch(e => {});
        result.style.color = 'red';
        result.innerText = 'गलत! सही: ' + currentQuestion.correct;
    }

    questionsPlayed++;
    setTimeout(loadNewQuestion, 3000);
}

function startTimer() {
    clearInterval(timerId);
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
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

// Lock button event
document.addEventListener('DOMContentLoaded', () => {
    const lockBtn = document.getElementById('lock-answer-btn');
    if (lockBtn) {
        lockBtn.addEventListener('click', checkSequence);
        console.log('Lock button ready! ID: lock-answer-btn');
    } else {
        console.warn('Lock button id="lock-answer-btn" नहीं मिला! HTML check karo.');
    }
});
