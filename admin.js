// 1. حماية الصفحة: التأكد أن الداخل هو الأدمن فقط
// فحص الصلاحيات أول ما الصفحة تفتح
// 1. حماية الصفحة: التأكد أن الداخل هو الأدمن فقط
// 1. حماية الصفحة المطورة
// حماية الصفحة: التأكد أن الداخل هو الأدمن فقط
 (function() {
    const role = localStorage.getItem('role');
    const userData = localStorage.getItem('user');
    let isAdmin = false;

    try {
        if (role === 'admin') {
            isAdmin = true;
        } else if (userData) {
            const user = JSON.parse(userData);
            if (user.role === 'admin') isAdmin = true;
        }
    } catch (e) {
        console.error("Auth Check Error");
    }

    if (!isAdmin) {
        console.log("Not an admin, redirecting...");
        window.location.replace('index.html');
    } else {
        console.log("Access Granted: Welcome Admin!");
    }
})();

// متغير لمتابعة عدد الأسئلة
let questionCount = 0;

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadResults();
    loadExams();
    loadUsers();
});

// 2. وظيفة إضافة خانات سؤال جديد (Quiz Builder) - المعدلة لإضافة الشرح
function addQuestionField() {
    questionCount++;
    const builder = document.getElementById('questionsBuilder');
    const qDiv = document.createElement('div');
    
    // تصميم كارت السؤال
    qDiv.className = "question-block p-5 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-3 relative mb-6 shadow-sm animate-fade-in";
    qDiv.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="bg-navy text-white text-xs px-3 py-1 rounded-full font-black uppercase" style="background-color:#1E3A8A">Question #${questionCount}</span>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 transition">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        
        <div>
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Question Text</label>
            <input type="text" placeholder="e.g. What is the past of 'Go'?" class="w-full p-3 border-2 border-white rounded-xl q-text font-bold focus:border-blue-300 outline-none transition">
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Option A</label>
                <input type="text" placeholder="Choice 1" class="w-full p-2 border-2 border-white rounded-lg opt outline-none focus:border-blue-200">
            </div>
            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Option B</label>
                <input type="text" placeholder="Choice 2" class="w-full p-2 border-2 border-white rounded-lg opt outline-none focus:border-blue-200">
            </div>
            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Option C</label>
                <input type="text" placeholder="Choice 3" class="w-full p-2 border-2 border-white rounded-lg opt outline-none focus:border-blue-200">
            </div>
            <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Option D</label>
                <input type="text" placeholder="Choice 4" class="w-full p-2 border-2 border-white rounded-lg opt outline-none focus:border-blue-200">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase text-green-600">Correct Answer</label>
            <select class="w-full p-3 border-2 border-white rounded-xl correct-ans bg-white font-black text-green-600 outline-none cursor-pointer">
                <option value="">-- Click to select the right answer --</option>
                <option value="0">Option A</option>
                <option value="1">Option B</option>
                <option value="2">Option C</option>
                <option value="3">Option D</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase text-blue-600">Explanation (Optional)</label>
            <textarea placeholder="Explain why this is the correct answer to help your students..." class="w-full p-3 border-2 border-white rounded-xl q-explanation font-medium focus:border-blue-200 outline-none transition h-20 bg-blue-50/50 resize-none"></textarea>
        </div>
    `;
    builder.appendChild(qDiv);
    // عمل Scroll تلقائي لآخر سؤال مضاف
    qDiv.scrollIntoView({ behavior: 'smooth' });
}

// 3. معالجة رفع الكورسات (Videos/PDFs)
document.getElementById('uploadCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('courseTitle').value);
    formData.append('grade', document.getElementById('courseGrade').value);
    formData.append('type', document.getElementById('courseType').value);
    formData.append('file', document.getElementById('courseFile').files[0]);

    try {
        const res = await fetch('/api/courses', { method: 'POST', body: formData });
        if (res.ok) {
            alert("🎯 Lesson Published Successfully!");
            e.target.reset();
        }
    } catch (err) { alert("Error uploading file."); }
});

// 4. معالجة حفظ الامتحان (Exam Submission)
document.getElementById('createExamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const questions = [];
    const blocks = document.querySelectorAll('.question-block');

    blocks.forEach(block => {
    const text = block.querySelector('.q-text').value;
    const options = Array.from(block.querySelectorAll('.opt')).map(i => i.value);
    const correct = block.querySelector('.correct-ans').value;
    const explanation = block.querySelector('.q-explanation').value; // السطر الجديد

    if (text && options.every(opt => opt.trim() !== "") && correct !== "") {
        questions.push({
            question: text,
            options: options,
            correct: parseInt(correct),
            explanation: explanation // ضفناه هنا
        });
    }
});

    if (questions.length === 0) {
        alert("⚠️ Please add at least one full question with all options and the correct answer selected.");
        return;
    }

    const examData = {
    title: document.getElementById('examTitle').value,
    grade: document.getElementById('examGrade').value,
    duration: document.getElementById('examDuration').value, // لازم السطر ده يكون موجود
    questions: questions
};

    try {
        const response = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(examData)
        });

        if (response.ok) {
            alert(`✅ Done! Exam "${examData.title}" is now live for Grade ${examData.grade} with ${questions.length} questions.`);
            window.location.reload();
        }
    } catch (err) {
        alert("❌ Failed to save exam. Check server connection.");
    }
});

// دالة لجلب نتائج الطلاب من السيرفر وعرضها
async function loadResults() {
    try {
        const res = await fetch('/api/results'); // السيرفر هيجيب البيانات من جدول results في Supabase
        const results = await res.json();
        const tableBody = document.getElementById('resultsTableBody');
        
        tableBody.innerHTML = results.map(r => `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-4 border-b font-bold text-gray-700">${r.studentName}</td>
                <td class="p-4 border-b text-center font-bold text-blue-600">${r.grade}</td>
                <td class="p-4 border-b text-gray-600">${r.examTitle}</td>
                <td class="p-4 border-b font-black ${r.score >= (r.total/2) ? 'text-green-600' : 'text-red-600'}">
                    ${r.score} / ${r.total}
                </td>
                <td class="p-4 border-b text-xs text-gray-400">${new Date(r.created_at).toLocaleString('ar-EG')}</td>
                <td class="p-4 border-b text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${r.score >= (r.total/2) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${r.score >= (r.total/2) ? 'Passed' : 'Failed'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Error loading results:", err);
    }
}


// تشغيل الدالة فور فتح الصفحة
loadResults();

// دالة لجلب وعرض الامتحانات عشان ميس شيماء تمسحها
async function loadExams() {
    try {
        const res = await fetch('/api/content?grade=all');
        const data = await res.json();
        const list = document.getElementById('examsList');
        
        list.innerHTML = data.exams.map(exam => `
            <div class="p-4 border-2 border-gray-100 rounded-2xl flex justify-between items-center bg-gray-50 hover:border-purple-200 transition">
                <div>
                    <p class="font-black text-navy">${exam.title}</p>
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Grade: ${exam.grade} | Time: ${exam.duration}m</p>
                </div>
                <button onclick="deleteExam(${exam.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    } catch (err) { console.error("Error loading exams:", err); }
}

// دالة حذف الامتحان
// دالة المسح الجديدة اللي بتكلم السيرفر و Supabase
async function deleteContent(type, id) {
    if (confirm("هل أنت متأكد من مسح هذا العنصر نهائياً؟")) {
        try {
            const res = await fetch(`/api/content/${type}/${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
                alert("تم الحذف بنجاح ✅");
                location.reload(); // تحديث الصفحة عشان يختفي
            }
        } catch (err) {
            alert("فشل في الاتصال بالسيرفر");
        }
    }
}

function printResults() {
    const table = document.querySelector('table').outerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Results Report</title>');
    win.document.write('<link rel="stylesheet" href="https://cdn.tailwindcss.com">');
    win.document.write('</head><body class="p-10">');
    win.document.write('<h1 class="text-2xl font-bold mb-5 text-center text-navy">Ms. Shaimaa Faisal Platform - Student Results</h1>');
    win.document.write(table);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

async function clearAllResults() {
    if (!confirm("⚠️ Are you sure you want to delete ALL results forever?")) return;

    try {
        // ندهنا على المسار الجديد هنا
        const response = await fetch('/api/clear-results', {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("🧹 Success: Database is now empty!");
            // تأكد إن الدالة دي موجودة عندك عشان تمسح الجدول من الشاشة
            document.getElementById('resultsTableBody').innerHTML = ''; 
        } else {
            alert("Error: Server refused to clear data.");
        }
    } catch (err) {
        alert("Connection Error: Is the server running?");
    }
}

// جلب قائمة الطلاب
async function loadUsers() {
    try {
        const res = await fetch('/api/admin/users');
        const users = await res.json();
        const tableBody = document.getElementById('usersTableBody');
        
       tableBody.innerHTML = users.map(u => `
    <tr class="hover:bg-gray-50 transition">
        <td class="p-4 border-b font-bold text-navy">${u.username}</td>
        
        <td class="p-4 border-b text-center">
            <span class="px-2 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${u.is_active ? 'نشط' : 'معلق'}
            </span>
        </td>

        <td class="p-4 border-b text-center font-mono text-gray-600">${u.password}</td>

        <td class="p-4 border-b text-center space-x-2">
            <button onclick="toggleActivation('${u.username}', ${!u.is_active})" 
                    class="px-3 py-1 rounded text-white text-xs font-bold transition ${u.is_active ? 'bg-orange-500' : 'bg-green-500 hover:bg-green-600'}">
                ${u.is_active ? 'إيقاف' : 'تفعيل'}
            </button>
            
            <button onclick="deleteUser('${u.username}')" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    </tr>
`).join('');
        
        // تحديث الرقم الإجمالي في الإحصائيات فوق
        document.getElementById('statTotalStudents').innerText = users.length;
    } catch (err) {
        console.error("Error loading users:", err);
    }
}

async function toggleActivation(username, status) {
    try {
        const res = await fetch('/api/admin/users/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, status })
        });
        if (res.ok) {
            loadUsers(); // تحديث الجدول فوراً بعد التفعيل
        }
    } catch (err) {
        alert("خطأ في الاتصال بالسيرفر");
    }
}

// مسح طالب من المنصة نهائياً
// مسح طالب من المنصة نهائياً
async function deleteUser(username) {
    // إظهار رسالة تأكيد قبل الحذف
    if (!confirm(`Are you sure you want to remove ${username}? They won't be able to login again.`)) return;

    try {
        // إرسال طلب الحذف للسيرفر باستخدام اسم المستخدم
        const res = await fetch(`/api/admin/users/${username}`, { 
            method: 'DELETE' 
        });

        if (res.ok) {
            // تنبيه بنجاح الحذف
            alert("❌ Student has been removed!");
            // إعادة تحميل القائمة لتحديث الجدول فوراً
            loadUsers(); 
        } else {
            const errorData = await res.json();
            alert("Error: " + errorData.message);
        }
    } catch (err) {
        // التعامل مع أخطاء الاتصال
        alert("Error connecting to server");
        console.error(err);
    }
}

// أول ما الصفحة تفتح، بننادي الدالة دي
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        // بنغير كلمة Error و Loading بالأرقام الحقيقية
        document.getElementById('statTotalStudents').innerText = data.totalStudents;
        document.getElementById('statBestExam').innerText = data.bestExam;
    } catch (error) {
        console.log("Error fetching stats:", error);
    }
}

// تشغيل الدالة فوراً
loadDashboardStats();



