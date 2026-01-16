// 1. أول ما الصفحة تفتح التأكد من المستخدم
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('welcomeName').innerText = `Welcome, ${user.username}`;
});

// 2. الدالة اللي الزراير بتنادي عليها (مهمة جداً)
function filterByGrade(gradeNumber) {
    // إظهار الحاوية
    const contentDiv = document.getElementById('gradeContent');
    if(contentDiv) contentDiv.classList.remove('hidden');

    // تمييز الزرار اللي ضغطت عليه
    const buttons = document.querySelectorAll('#gradesGrid button');
    buttons.forEach(btn => {
        btn.classList.remove('border-gold', 'text-gold', 'bg-blue-50');
        if (btn.innerText.includes(gradeNumber)) {
            btn.classList.add('border-gold', 'text-gold', 'bg-blue-50');
        }
    });

    // تشغيل دالة جلب البيانات
    loadGradeContent(gradeNumber);
}

// 3. دالة جلب البيانات من السيرفر
async function loadGradeContent(grade) {
    const examsList = document.getElementById('examsList');
    const coursesContainer = document.getElementById('coursesContainer');

    // إظهار حالة التحميل
    const loading = `<p class="text-gray-400 animate-pulse italic">Loading Grade ${grade} content...</p>`;
    if(examsList) examsList.innerHTML = loading;
    if(coursesContainer) coursesContainer.innerHTML = loading;

    try {
        const response = await fetch(`/api/content?grade=${grade}`);
        const data = await response.json();

        // عرض الدروس
        if (data.lessons && data.lessons.length > 0) {
            coursesContainer.innerHTML = data.lessons.map(lesson => `
                <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-4">
                    <div class="h-32 bg-navy flex items-center justify-center text-white text-4xl mb-3 rounded-lg" style="background-color:#1E3A8A">
                        <i class="${lesson.type === 'video' ? 'fas fa-play-circle' : 'fas fa-file-pdf text-red-400'}"></i>
                    </div>
                    <h4 class="text-lg font-bold text-navy" style="color:#1E3A8A">${lesson.title}</h4>
                    <p class="text-xs text-gray-500 mb-4 uppercase font-bold">${lesson.type}</p>
                    <a href="${lesson.filePath}" target="_blank" class="block text-center text-white py-2 rounded-lg font-bold hover:bg-blue-800 transition" style="background-color:#1E3A8A">
                        Open Lesson
                    </a>
                </div>
            `).join('');
        } else {
            coursesContainer.innerHTML = `<p class="text-gray-400 italic col-span-full">No lessons available for Grade ${grade}.</p>`;
        }

        // عرض الامتحانات
        if (data.exams && data.exams.length > 0) {
            examsList.innerHTML = data.exams.map(exam => `
                <div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center border-l-4 border-navy" style="border-left-color:#1E3A8A">
                    <span class="font-bold text-navy" style="color:#1E3A8A">${exam.title}</span>
                    <button onclick="startExam(${exam.id})" class="text-white px-4 py-1 rounded text-sm font-bold" style="background-color:#1E3A8A">Start Quiz</button>
                </div>
            `).join('');
        } else {
            examsList.innerHTML = `<p class="text-gray-400 italic">No exams available for Grade ${grade}.</p>`;
        }

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// الدالة اللي بتبدأ الامتحان
function startExam(examId) {
    if (!examId) return;
    
    // بنسيف رقم الامتحان اللي الطالب اختاره عشان صفحة الـ quiz تعرفه
    localStorage.setItem('currentExamId', examId);
    
    // بنوديه لصفحة الامتحان
    window.location.href = 'quiz.html';
}