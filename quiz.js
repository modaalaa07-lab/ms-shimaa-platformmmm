let currentExam = null;
let currentQuestionIndex = 0;
let score = 0;
let cheatCount = 0;

// منع الريفريش أو قفل الصفحة أثناء الامتحان
window.onbeforeunload = function() {
    return "Are you sure you want to leave? Your exam progress will be lost!";
};

// أول ما الامتحان يخلص والنتيجة تظهر، لازم نلغي المنع ده عشان الطالب يعرف يتنقل في الموقع
function disablePreventExit() {
    window.onbeforeunload = null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const examId = localStorage.getItem('currentExamId');
    if (!examId) {
        window.location.href = 'main.html';
        return;
    }

    // 1. اطلب الاسم
    const studentName = prompt("Please enter your TRIPLE full name:");
    
    if (!studentName || studentName.trim().split(/\s+/).length < 3) {
        alert("❌ لازم اسمك الثلاثي!");
        window.location.href = 'main.html';
        return;
    }
    
    localStorage.setItem('currentStudentName', studentName);

    // 2. الحل السحري: اصبر ثانية واحدة قبل تفعيل نظام الغش
    // عشان نضمن إن الـ prompt اختفى والصفحة رجعت فوكس
    setTimeout(() => {
        enableAntiCheat(); 
        console.log("Anti-Cheat Activated safely.");
    }, 1000); 

    // 3. كمل تحميل الامتحان عادي
    try {
        const response = await fetch('/api/content?grade=all'); 
        const data = await response.json();
        currentExam = data.exams.find(e => e.id == examId);

        if (currentExam && currentExam.questions && currentExam.questions.length > 0) {
            displayQuestion();
            if (currentExam.duration) startTimer(currentExam.duration);
        } else {
            alert("Exam not found!");
            window.location.href = 'main.html';
        }
    } catch (err) {
        alert("Connection Error!");
    }
});

function displayQuestion() {
    // التأكد إننا لسه جوه حدود عدد الأسئلة
    if (!currentExam || currentQuestionIndex >= currentExam.questions.length) {
        finishExam();
        return;
    }

    const q = currentExam.questions[currentQuestionIndex];
    const container = document.getElementById('qContent');
    
    document.getElementById('qTitle').innerText = currentExam.title;
    document.getElementById('qProgress').innerText = `Question ${currentQuestionIndex + 1} of ${currentExam.questions.length}`;

    container.innerHTML = `
        <div class="text-xl font-bold text-navy bg-gray-50 p-6 rounded-2xl border-l-8 border-navy mb-4" style="color:#1E3A8A; border-left-color:#1E3A8A">
            ${q.question}
        </div>
        <div class="grid grid-cols-1 gap-3">
            ${q.options.map((opt, index) => `
                <button onclick="selectOption(${index})" class="option-btn text-left p-4 border-2 border-gray-100 rounded-2xl transition-all font-bold text-gray-700 flex justify-between items-center group hover:border-yellow-400 hover:bg-yellow-50">
                    <span>${opt}</span>
                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-yellow-500"></i>
                </button>
            `).join('')}
        </div>
    `;
}

function selectOption(selectedIndex) {
    // حماية: التأكد من وجود السؤال قبل قراءة 'correct'
    const currentQuestion = currentExam.questions[currentQuestionIndex];
    
    if (currentQuestion) {
        if (selectedIndex == currentQuestion.correct) {
            score++;
        }
    }

    // الانتقال للسؤال التالي
    currentQuestionIndex++;

    if (currentQuestionIndex < currentExam.questions.length) {
        displayQuestion();
    } else {
        finishExam();
    }
}

async function finishExam() {
    clearInterval(timerInterval); // توقيف الوقت فوراً
    
    const studentName = localStorage.getItem('currentStudentName') || "Unknown Student";
    const totalQuestions = currentExam.questions.length;
    const percent = Math.round((score / totalQuestions) * 100);
    
    // 1. تحديد الحالة النهائية (نجاح/رسوب/غش)
    let finalStatus = "✅ Completed";
    if (cheatCount >= 3) {
        finalStatus = "❌ Terminated (Cheating)";
        score = 0; // تصفير الدرجة لو غش
    } else if (percent < 50) {
        finalStatus = "⚠️ Failed";
    }

    // 2. إرسال النتيجة للسيرفر لميس شيماء
    const resultData = {
    username: studentName,
    // التأكد من سحب الجريد من بيانات الامتحان الحالية
    grade: currentExam.grade, 
    examTitle: currentExam.title,
    score: score,
    total: totalQuestions,
    status: finalStatus,
    date: new Date().toISOString() // إضافة التاريخ عشان يظهر صح
};

    localStorage.setItem('lastScore', `${score} / ${totalQuestions}`);

    try {
        await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });
    } catch (err) { console.error("Error saving result:", err); }

    // 3. بناء مراجعة الأسئلة مع الشرح (Explanation)
    let reviewHTML = `
        <div class="mt-8 text-left space-y-4">
            <h3 class="font-black text-navy text-xl border-b pb-2 italic">
                <i class="fas fa-book-reader mr-2"></i> Review Your Answers:
            </h3>`;

    currentExam.questions.forEach((q, idx) => {
        reviewHTML += `
            <div class="p-4 bg-white rounded-2xl border-2 border-gray-50 shadow-sm">
                <p class="font-bold text-gray-800">Q${idx + 1}: ${q.question}</p>
                <p class="text-green-600 font-bold text-sm mt-2">
                    <i class="fas fa-check-circle mr-1"></i> Correct Answer: ${q.options[q.correct]}
                </p>
                ${q.explanation ? `
                    <div class="text-blue-500 text-xs mt-3 italic font-medium bg-blue-50 p-3 rounded-xl border-l-4 border-blue-400">
                        <i class="fas fa-lightbulb mr-1"></i> Explanation: ${q.explanation}
                    </div>
                ` : ''}
            </div>`;
    });
    reviewHTML += `</div>`;

    // 4. عرض الواجهة النهائية كاملة
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="text-center py-10 animate-fade-in">
            <div class="inline-block p-6 rounded-full ${score >= (totalQuestions/2) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} text-6xl mb-6">
                <i class="fas ${score >= (totalQuestions/2) ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </div>
            
            <h2 class="text-3xl font-black text-navy mb-2" style="color:#1E3A8A">Quiz Finished!</h2>
            <p class="text-gray-500 mb-6 font-bold uppercase tracking-widest text-sm">Well done, ${studentName}</p>
            
            <div class="bg-gray-50 rounded-3xl p-8 mb-8 border-2 border-dashed border-gray-200">
                <div class="text-6xl font-black text-navy" style="color:#1E3A8A">${cheatCount >= 3 ? 0 : percent}%</div>
                <p class="text-navy font-bold mt-2">Final Score: ${score} / ${totalQuestions}</p>
            </div>

            ${(percent >= 50 && cheatCount < 3) ? `
                <button onclick="window.open('certificate.html', '_blank')" class="w-full bg-yellow-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-yellow-600 transition flex items-center justify-center gap-2 mb-4 transform hover:scale-[1.02]">
                    <i class="fas fa-graduation-cap"></i> GET YOUR CERTIFICATE
                </button>
            ` : ''}

            ${reviewHTML}

            <button onclick="window.location.href='main.html'" class="mt-8 w-full bg-navy text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-900 transition" style="background-color:#1E3A8A">
                Return to Dashboard
            </button>
        </div>
    `;

    // تنظيف بيانات الامتحان
    localStorage.removeItem('currentExamId');
}

// --- نظام مكافحة الغش (Anti-Cheat System) --لخروج

// دالة مراقبة الغش - مش هتشتغل غير لما نناديها
function enableAntiCheat() {
    window.onblur = function() {
        cheatCount++;
        if (cheatCount === 1) {
            alert("⚠️ تحذير أول: ممنوع الخروج من صفحة الامتحان!");
        } else if (cheatCount === 2) {
            alert("🚫 تحذير أخير: المرة الجاية السيستم هيقفل الامتحان!");
        } else if (cheatCount >= 3) {
            alert("❌ تم إنهاء الامتحان لمحاولة الغش.");
            score = 0; 
            finishExam(); 
        }
    };
}

let timeLeft; // بالثواني
let timerInterval;

function startTimer(minutes) {
    timeLeft = minutes * 60;
    const timerDisplay = document.getElementById('timer');

    timerInterval = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        
        timerDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time is up!");
            finishExam(); // قفل الامتحان تلقائياً
        }
        timeLeft--;
    }, 1000);
}

// استدعي الدالة دي جوه الـ DOMContentLoaded أول ما الامتحان يحمل
// startTimer(currentExam.duration);

// الكود ده بيتحط في آخر ملف js/quiz.js
function showResult(score, total) {
    const percentage = (score / total) * 100;
    const resultDiv = document.getElementById('resultArea'); 

    if (!resultDiv) return;

    let certificateBtn = '';
    
    // لو جاب 80% أو أكتر يظهر زرار الشهادة
    if (percentage >= 80) {
        certificateBtn = `
            <div style="margin-top: 20px;">
                <p style="color: #059669; font-weight: bold; font-size: 1.2rem;">Excellent! You passed the exam! 🎉</p>
                <button onclick="generateCertificate('${score}', '${total}')" 
                    style="background-color: #FBBF24; color: #1E3A8A; font-weight: 900; padding: 15px 30px; border-radius: 15px; cursor: pointer; border: none; margin-top: 10px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);">
                    <i class="fas fa-award"></i> GET YOUR CERTIFICATE
                </button>
            </div>
        `;
    } else {
        certificateBtn = `<p style="color: #DC2626; margin-top: 20px; font-weight: bold;">Keep studying to get the certificate!</p>`;
    }

    resultDiv.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 20px; shadow: 0 10px 25px rgba(0,0,0,0.1); border: 2px solid #1E3A8A;">
            <h2 style="font-size: 2rem; color: #1E3A8A; margin-bottom: 10px;">Your Result</h2>
            <p style="font-size: 1.5rem; font-weight: bold;">${score} / ${total}</p>
            ${certificateBtn}
        </div>
    `;
    
    // إخفاء منطقة الأسئلة عشان النتيجة بس اللي تبان
    document.getElementById('quizContainer').style.display = 'none';
}

function generateCertificate(score, total) {
    const studentName = localStorage.getItem('currentStudentName') || "Hero Student";
    window.location.href = `certificate.html?name=${encodeURIComponent(studentName)}&score=${score}&total=${total}`;
    disablePreventExit();
}