/**
 * Ms. Shaimaa Faisal Platform - Auth System
 * Developed for: Mohamed Morsy
 * Purpose: Secure Admin Login & Student Redirection
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // التأكد من وجود الفورم قبل التشغيل عشان ميديناش Error
    if (!loginForm) {
        console.error("Critical Error: Login form not found in DOM.");
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // إيقاف التحميل التلقائي للصفحة

        // جلب العناصر والبيانات من الـ IDs المحددة في index.html
        const userField = document.getElementById('loginUser');
        const passField = document.getElementById('loginPass');
        
        // التحقق إن الخانات موجودة فعلياً
        if (!userField || !passField) {
            alert("حدث خطأ في تحميل عناصر الصفحة!");
            return;
        }

        const username = userField.value.trim();
        const password = passField.value.trim();

        // إعداد رسالة تحميل بسيطة في الكونسول
        console.log("Attempting login for:", username);

        // --- الجزء الأول: نظام بوابة الأدمن (دخول قسري) ---
        if ((username === "admin" || username === "Mohamed Morsy") && password === "123") {
            
            // تجهيز كائن البيانات الخاص بالأدمن
            const adminData = {
                username: "Mohamed Morsy",
                role: "admin",
                loginTime: new Date().toISOString(),
                isAuthorized: true
            };

            // تخزين البيانات في الـ LocalStorage عشان صفحة الأدمن تعرفك
            localStorage.setItem('user', JSON.stringify(adminData));
            localStorage.setItem('currentStudentName', adminData.username);
            
            console.log("Authentication Success: Admin Identity Verified.");
            
            // التحويل الفوري لصفحة لوحة التحكم
            window.location.replace('admin.html');
            return; // إنهاء العملية تماماً هنا للأدمن
        }

        // --- الجزء الثاني: نظام بوابة الطلاب (ربط السيرفر) ---
        try {
            // إظهار علامة تحميل لو حابب مستقبلاً
            console.log("Redirecting to Student Dashboard...");

            // تخزين بيانات مؤقتة للطالب
            const studentData = {
                username: username,
                role: "student",
                loginTime: new Date().toISOString()
            };

            localStorage.setItem('user', JSON.stringify(studentData));
            localStorage.setItem('currentStudentName', username);

            // تحويل الطالب لصفحة الدروس
            window.location.href = 'main.html';

        } catch (error) {
            // معالجة أي خطأ غير متوقع في الكود
            console.error("Login System Error:", error);
            alert("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
        }
    });

    // إضافة تأثيرات بصرية بسيطة عند التركيز على الخانات
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#1E3A8A';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = 'transparent';
        });
    });
});