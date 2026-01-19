document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // بيمنع الصفحة من عمل ريفريش عشان الكود يلحق يشتغل

    const username = document.getElementById('username').value.trim(); // بيسحب الاسم ويشيل المسافات الزائدة
    const password = document.getElementById('password').value; // بيسحب الباسورد

    // 1. طريق الأدمن (أنت فقط): دخول مباشر لصفحة التحكم فوراً
    if (username === "Mohamed Morsy" && password === "123") {
        const adminUser = { username: "Mohamed Morsy", role: "admin" };
        localStorage.setItem('user', JSON.stringify(adminUser)); // بيخزن بياناتك عشان الحارس في صفحة الأدمن يعرفك
        window.location.replace('admin.html'); // بيفتح صفحة الأدمن وبيمسح صفحة اللوجين من الذاكرة لمنع الـ Loop
        return; // سطر مهم جداً بيوقف الكود هنا عشان ميروحش للسيرفر كطالب
    }

    // 2. طريق الطلاب: يروحوا حصرياً لصفحة الـ main.html
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // حفظ بيانات الطالب
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // التأكد إن الطالب "مستحيل" يروح لصفحة الأدمن
            if (data.user.role === 'admin') {
                window.location.replace('admin.html');
            } else {
                window.location.replace('main.html');
            }
        } else {
            if (errorDiv) {
                errorDiv.classList.remove('hidden');
                errorDiv.innerText = data.message || "بيانات الطالب غير صحيحة!";
            }
        }
    } catch (err) {
        console.error("Connection Error:", err);
        alert("فشل الاتصال بالسيرفر");
    }
});