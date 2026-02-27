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
        console.log("Loading:", fileName);
        const res = await fetch(fileName + '?v=' + Date.now());
        if (!res.ok) throw new Error('File issue: ' + res.status);
        
        let data = await res.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        console.log("Questions loaded:", currentQuestionsPool.length);

        // Silver/Gold/Platinum format को normalize करो (options array → A/B/C/D object, correct text → letters)
        currentQuestionsPool = currentQuestionsPool.map(item => {
            if (item.q && Array.isArray(item.options) && item.a) {
                // Silver format
                const opts = {};
                item.options.forEach((opt, index) => {
                    opts[String.fromCharCode(65 + index)] = opt;  // 0 → A, 1 → B, etc.
                });
                
                // "a" text-based है, तो correct order letters में convert
                const correctOptions = item.a.split(',').map(s => s.trim());
                let correctStr = '';
                correctOptions.forEach(corrText => {
                    const idx = item.options.findIndex(opt => opt.trim() === corrText);
                    if (idx !== -1) correctStr += String.fromCharCode(65 + idx);
                });
                
                return {
                    question: item.q,
                    options: opts,
                    correct: correctStr
                };
            }
            // Free format (already good)
            return item;
        });

        loadNewQuestion();
    } catch (err) {
        console.error("Error:", err);
        alert("सवाल लोड नहीं हो रहे! Free मोड ट्राई करो।");
        loadFreeFallback();
    }
}

function loadFreeFallback() {
    const freeQs = [
        { "q": "इन प्रसिद्ध त्योहारों को साल में आने वाले उनके सही क्रम में लगाएँ:", "options": ["होली", "दीवाली", "रक्षाबंधन", "गणेश चतुर्थी"], "a": "होली, रक्षाबंधन, गणेश चतुर्थी, दीवाली" },
        { "q": "इन भारतीय शहरों को पूर्व से पश्चिम के क्रम में लगाएँ:", "options": ["कोलकाता", "पटना", "लखनऊ", "दिल्ली"], "a": "कोलकाता, पटना, लखनऊ, दिल्ली" },
        { "q": "इन संख्याओं को बढ़ते क्रम (छोटे से बड़े) में लगाएँ:", "options": ["निन्यानवे", "एक सौ एक", "अठासी", "एक सौ दस"], "a": "अठासी, निन्यानवे, एक सौ एक, एक सौ दस" },
        { "q": "इन क्रिकेट प्रारूपों को उनकी अवधि के अनुसार छोटे से बड़े क्रम में लगाएँ:", "options": ["टी-20", "एकदिवसीय", "टेस्ट मैच", "टी-10"], "a": "टी-10, टी-20, एकदिवसीय, टेस्ट मैच" },
        { "q": "इन रंगों को इंद्रधनुष के क्रम में लगाएँ:", "options": ["लाल", "नीला", "पीला", "हरा"], "a": "पीला, हरा, नीला, लाल" },
        { "q": "इन प्रधानमंत्रियों को उनके कार्यकाल के अनुसार पहले से बाद के क्रम में लगाएँ:", "options": ["इन्दिरा गांधी", "जवाहरलाल नेहरू", "नरेन्द्र मोदी", "अटल बिहारी वाजपेयी"], "a": "जवाहरलाल नेहरू, इन्दिरा गांधी, अटल बिहारी वाजपेयी, नरेन्द्र मोदी" },
        { "q": "इन शरीर के अंगों को ऊपर से नीचे के क्रम में लगाएँ:", "options": ["आँख", "घुटना", "कंधा", "कमर"], "a": "आँख, कंधा, कमर, घुटना" },
        { "q": "इन ग्रहों को सूर्य से बढ़ती दूरी के हिसाब से लगाएँ:", "options": ["पृथ्वी", "शुक्र", "मंगल", "बुध"], "a": "बुध, शुक्र, पृथ्वी, मंगल" },
        { "q": "इन खेलों को उनके खिलाड़ियों की संख्या के अनुसार कम से ज्यादा में लगाएँ:", "options": ["क्रिकेट", "टेनिस (एकल)", "पोलो", "बास्केटबॉल"], "a": "टेनिस (एकल), पोलो, बास्केटबॉल, क्रिकेट" },
        { "q": "इन प्रसिद्ध स्मारकों को उत्तर से दक्षिण के क्रम में लगाएँ:", "options": ["ताजमहल", "इंडिया गेट", "चारमीनार", "विवेकानंद रॉक"], "a": "इंडिया गेट, ताजमहल, चारमीनार, विवेकानंद रॉक" },
        { "q": "इन ऐतिहासिक युगों को पहले से बाद के क्रम में लगाएँ:", "options": ["सतयुग", "कलियुग", "त्रेतायुग", "द्वापरयुग"], "a": "सतयुग, त्रेतायुग, द्वापरयुग, कलियुग" },
        { "q": "इन दिशाओं को घड़ी की सुई की दिशा में (उत्तर से शुरू करके) लगाएँ:", "options": ["दक्षिण", "पश्चिम", "पूर्व", "उत्तर"], "a": "उत्तर, पूर्व, दक्षिण, पश्चिम" },
        { "q": "इन हिंदी महीनों को साल की शुरुआत से क्रम में लगाएँ:", "options": ["फाल्गुन", "चैत्र", "वैशाख", "सावन"], "a": "चैत्र, वैशाख, सावन, फाल्गुन" },
        { "q": "इन प्रसिद्ध नदियों को उनकी लंबाई के अनुसार कम से ज्यादा में लगाएँ:", "options": ["यमुना", "गंगा", "नर्मदा", "ताप्ती"], "a": "ताप्ती, नर्मदा, यमुना, गंगा" },
        { "q": "इन सिक्कों/नोटों को उनके मूल्य के अनुसार बढ़ते क्रम में लगाएँ:", "options": ["दस रुपया", "दो रुपया", "पाँच रुपया", "बीस रुपया"], "a": "दो रुपया, पाँच रुपया, दस रुपया, बीस रुपया" },
        { "q": "इन जीव-जंतुओं को उनके आकार के अनुसार छोटे से बड़े क्रम में लगाएँ:", "options": ["हाथी", "चींटी", "बिल्ली", "गाय"], "a": "चींटी, बिल्ली, गाय, हाथी" },
        { "q": "इन यातायात साधनों को उनकी सामान्य गति के अनुसार धीमी से तेज़ क्रम में लगाएँ:", "options": ["हवाई जहाज़", "साइकिल", "कार", "रेलगाड़ी"], "a": "साइकिल, कार, रेलगाड़ी, हवाई जहाज़" },
        { "q": "इन महाद्वीपों को उनके क्षेत्रफल के अनुसार बड़े से छोटे क्रम में लगाएँ:", "options": ["एशिया", "अफ्रीका", "ऑस्ट्रेलिया", "यूरोप"], "a": "एशिया, अफ्रीका, यूरोप, ऑस्ट्रेलिया" },
        { "q": "इन मुगल शासकों को उनके शासन के समय के अनुसार क्रम में लगाएँ:", "options": ["अकबर", "बाबर", "शाहजहाँ", "हुमायूँ"], "a": "बाबर, हुमायूँ, अकबर, शाहजहाँ" },
        { "q": "इन वाद्य यंत्रों को उनके वर्णमाला (अ-ज्ञ) के क्रम में लगाएँ:", "options": ["तबला", "बाँसुरी", "सितार", "ढोलक"], "a": "तबला, ढोलक, बाँसुरी, सितार" },
        { "q": "इन भारतीय राज्यों को उनकी जनसंख्या के अनुसार कम से ज्यादा में लगाएँ:", "options": ["सिक्किम", "उत्तर प्रदेश", "महाराष्ट्र", "बिहार"], "a": "सिक्किम, बिहार, महाराष्ट्र, उत्तर प्रदेश" },
        { "q": "इन वृक्षों को उनके नाम के अनुसार वर्णमाला क्रम में लगाएँ:", "options": ["बरगद", "नीम", "पीपल", "आम"], "a": "आम, नीम, पीपल, बरगद" },
        { "q": "इन धार्मिक ग्रंथों को उनके नाम के वर्णमाला क्रम में लगाएँ:", "options": ["रामायण", "महाभारत", "गीता", "वेद"], "a": "गीता, महाभारत, रामायण, वेद" },
        { "q": "इन ग्रहों को उनके आकार के अनुसार छोटे से बड़े क्रम में लगाएँ:", "options": ["बृहस्पति", "बुध", "पृथ्वी", "शनि"], "a": "बुध, पृथ्वी, शनि, बृहस्पति" },
        { "q": "इन प्रसिद्ध अभिनेताओं को उनकी आयु के अनुसार बड़े से छोटे क्रम में लगाएँ:", "options": ["अमिताभ बच्चन", "शाहरुख खान", "रणबीर कपूर", "दिलीप कुमार"], "a": "दिलीप कुमार, अमिताभ बच्चन, शाहरुख खान, रणबीर कपूर" },
        { "q": "इन पक्षियों को उनके आकार के अनुसार छोटे से बड़े क्रम में लगाएँ:", "options": ["शुतुरमुर्ग", "गौरैया", "कबूतर", "बाज"], "a": "गौरैया, कबूतर, बाज, शुतुरमुर्ग" },
        { "q": "इन महासागरों को उनके क्षेत्रफल के अनुसार बड़े से छोटे क्रम में लगाएँ:", "options": ["प्रशांत", "अटलांटिक", "हिंद", "आर्कटिक"], "a": "प्रशांत, अटलांटिक, हिंद, आर्कटिक" },
        { "q": "इन भारतीय शहरों को उनकी आबादी के अनुसार ज्यादा से कम में लगाएँ:", "options": ["मुंबई", "इंदौर", "दिल्ली", "भोपाल"], "a": "मुंबई, दिल्ली, भोपाल, इंदौर" },
        { "q": "इन धातुओं को उनकी कीमत के अनुसार कम से ज्यादा में लगाएँ:", "options": ["सोना", "चाँदी", "लोहा", "ताँबा"], "a": "लोहा, ताँबा, चाँदी, सोना" },
        { "q": "इन फलों को उनके बीजों की संख्या के अनुसार कम से ज्यादा में लगाएँ:", "options": ["आम", "पपीता", "तरबूज", "केला"], "a": "आम, केला, पपीता, तरबूज" },
        { "q": "इन भारतीय राज्यों को उत्तर से दक्षिण के क्रम में लगाएँ:", "options": ["कश्मीर", "केरल", "पंजाब", "मध्य प्रदेश"], "a": "कश्मीर, पंजाब, मध्य प्रदेश, केरल" },
        { "q": "इन समय की इकाइयों को छोटी से बड़ी अवधि में लगाएँ:", "options": ["सेकंड", "मिनट", "घंटा", "दिन"], "a": "सेकंड, मिनट, घंटा, दिन" },
        { "q": "इन महान हस्तियों को उनके जन्म के वर्ष के अनुसार पहले से बाद में लगाएँ:", "options": ["महात्मा गांधी", "भगत सिंह", "स्वामी विवेकानंद", "डॉ. आंबेडकर"], "a": "स्वामी विवेकानंद, महात्मा गांधी, डॉ. आंबेडकर, भगत सिंह" },
        { "q": "इन राष्ट्रीय प्रतीकों को वर्णमाला क्रम में लगाएँ:", "options": ["कमल", "बाघ", "मोर", "तिरंगा"], "a": "कमल, तिरंगा, बाघ, मोर" },
        { "q": "इन सौरमंडल की वस्तुओं को सूर्य से उनकी दूरी के अनुसार लगाएँ:", "options": ["चंद्रमा", "शनि", "शुक्र", "वरुण"], "a": "शुक्र, चंद्रमा, शनि, वरुण" },
        { "q": "इन भारतीय खेलों को लोकप्रियता के अनुसार वर्णमाला क्रम में लगाएँ:", "options": ["कबड्डी", "कुश्ती", "खो-खो", "हाकी"], "a": "कबड्डी, कुश्ती, खो-खो, हाकी" },
        { "q": "इन पर्वतों को उनकी ऊँचाई के अनुसार कम से ज्यादा में लगाएँ:", "options": ["एवरेस्ट", "कंचनजंगा", "अरावली", "हिमालय"], "a": "अरावली, कंचनजंगा, हिमालय, एवरेस्ट" },
        { "q": "इन भारतीय नोटों को उनके रंग के अनुसार वर्णमाला क्रम में लगाएँ:", "options": ["हरा", "नीला", "लाल", "पीला"], "a": "नीला, पीला, लाल, हरा" }
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
    userSequence = "";
    timeLeft = 20;

    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.q || currentQuestion['प्रश्न'] || currentQuestion.question || "Question missing!";
    document.getElementById('result').innerText = "";

    const optsDiv = document.getElementById('options-container');
    optsDiv.innerHTML = "";

    // Yeh line important hai – options को A, B, C, D में convert करो
    let options = currentQuestion.options || {};
    if (Array.isArray(currentQuestion['विकल्प'])) {
        // Hindi format array → A B C D object
        const letters = ['A', 'B', 'C', 'D'];
        currentQuestion['विकल्प'].forEach((opt, i) => {
            if (opt) {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.id = 'btn-' + letters[i];
                btn.innerHTML = letters[i] + ": " + opt;
                btn.addEventListener('click', () => selectOption(letters[i]));
                optsDiv.appendChild(btn);
            }
        });
    } else if (typeof options === 'object' && Object.keys(options).length > 0) {
        // Free format object {A:..., B:...}
        Object.keys(options).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.id = 'btn-' + key;
            btn.innerHTML = key + ": " + options[key];
            btn.addEventListener('click', () => selectOption(key));
            optsDiv.appendChild(btn);
        });
    } else {
        alert("Options missing in question!");
    }

    bgMusic.play().catch(() => {});
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
