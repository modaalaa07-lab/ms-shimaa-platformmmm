/**
 * @project Ms. Shaimaa Faisal Educational Platform
 * @author Developed for Mohamed Morsy (Admin Authority)
 * @version 2.0.0 - Extreme Stability Mode
 * @description This script handles multi-role authentication with fail-safe redirection.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. التعريفات الأساسية والتأكد من عناصر الصفحة
    const loginForm = document.getElementById('loginForm');
    const userField = document.getElementById('loginUser');
    const passField = document.getElementById('loginPass');

    // فحص أمان أولي: التأكد أن الفورم موجود لتجنب أخطاء الكونسول
    if (!loginForm) {
        console.warn("Auth System: Login form elements not found in this page context.");
        return;
    }

    // 2. مستمع الأحداث لعملية تسجيل الدخول
    loginForm.addEventListener('submit', async (event) => {
        // منع السلوك الافتراضي للمتصفح (التحميل التلقائي)
        event.preventDefault();

        // استخراج وتطهير البيانات المدخلة
        const inputUsername = userField.value.trim();
        const inputPassword = passField.value.trim();

        console.log(`[Auth Log]: Attempting login sequence for user: ${inputUsername}`);

        // --- المرحلة الأولى: التحقق من الهوية السيادية (الأدمن) ---
        // يتم فحص بياناتك "Mohamed Morsy" محلياً لضمان الدخول حتى لو السيرفر فيه مشكلة
        if ((inputUsername === "Mohamed Morsy" || inputUsername === "admin") && inputPassword === "123") {
            
            console.log("[Auth Success]: Admin Access Granted. Preparing Secure Session...");

            // إعداد كائن البيانات الكامل للأدمن (Payload)
            const adminSessionData = {
                username: "Mohamed Morsy",
                role: "admin",
                isAuthorized: true,
                loginTimestamp: new Date().toLocaleString('ar-EG'),
                sessionID: 'ADM-' + Math.random().toString(36).substr(2, 9).toUpperCase()
            };

            // تخزين البيانات في الـ LocalStorage بصيغة JSON موحدة لكل الصفحات
            localStorage.setItem('user', JSON.stringify(adminSessionData));
            localStorage.setItem('currentStudentName', adminSessionData.username);
            localStorage.setItem('userRole', 'admin');

            // التحويل الفوري لصفحة الإدارة (استخدام replace لمنع الرجوع للخلف)
            window.location.replace('admin.html');
            return; // إنهاء الدالة فوراً لمنع تداخل كود الطلاب
        }

        // --- المرحلة الثانية: التحقق من هوية الطلاب عبر السيرفر ---
        try {
            console.log("[Auth Process]: Forwarding credentials to API server...");

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ 
                    username: inputUsername, 
                    password: inputPassword 
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log("[Auth Success]: Student credentials verified by database.");

                // دمج البيانات القادمة من السيرفر مع بيانات الجلسة المحلية
                const studentSessionData = {
                    ...result.user,
                    loginTimestamp: new Date().toLocaleString('ar-EG'),
                    device: navigator.userAgent.substring(0, 50)
                };

                // التخزين لضمان توافق الـ main.js مع الـ admin.js
                localStorage.setItem('user', JSON.stringify(studentSessionData));
                localStorage.setItem('currentStudentName', studentSessionData.username);
                localStorage.setItem('userRole', studentSessionData.role);

                // فحص الـ Role المحول من السيرفر كطبقة أمان ثانية
                if (studentSessionData.role === 'admin') {
                    window.location.replace('admin.html');
                } else {
                    window.location.replace('main.html');
                }
            } else {
                // معالجة أخطاء السيرفر (بيانات غلط أو حساب غير مفعل)
                alert(result.message || "❌ خطأ في الدخول: تأكد من الاسم وكلمة السر أو انتظر تفعيل الحساب.");
            }

        } catch (connectionError) {
            console.error("[Auth Critical Error]: Failed to communicate with server.", connectionError);
            alert("⚠️ فشل الاتصال بالسيرفر! تأكد من تشغيل الـ Backend (Node.js) الخاص بك.");
        }
    });

    // 3. تحسينات تجربة المستخدم (UI Effects)
    const inputs = [userField, passField];
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = "scale(1.02)";
            input.parentElement.style.transition = "0.3s ease";
        });
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = "scale(1)";
        });
    });
});

/**
 * دالة الدخول السري للأدمن - Mohamed Morsy
 */
function secretAdminAccess() {
    // هيظهر مربع يطلب باسوورد
    const accessCode = prompt("Enter Secret Admin Key:");
    
    // لو كتبت الباسوورد السري (مثلاً 000)
    if (accessCode === "000") {
        const adminData = { 
            username: "Mohamed Morsy", 
            role: "admin",
            isAuthorized: true 
        };
        
        // تخزين البيانات فوراً وتخطي أي لوجين
        localStorage.setItem('user', JSON.stringify(adminData));
        localStorage.setItem('userRole', 'admin');
        
        alert("Welcome Back, Boss! Redirecting...");
        window.location.href = 'admin.html'; // تحويل مباشر
    } else {
        console.log("Access Denied"); // لو حد جرب غلط ميعرفش حاجة
    }
}

/**
 * End of Secure Auth System
 * Total lines of pure logic: 90+
 */