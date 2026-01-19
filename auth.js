document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if (errorDiv) errorDiv.classList.add('hidden');

    // 1. طريق الأدمن (أنت فقط): دخول مباشر لصفحة التحكم
    if (username === "Mohamed Morsy" && password === "123") {
        const adminUser = { username: "Mohamed Morsy", role: "admin" };
        localStorage.setItem('user', JSON.stringify(adminUser));
        console.log("Welcome Admin Mohamed!");
        window.location.replace('admin.html'); 
        return; // بنوقف الكود هنا عشان ميكملش لتحت
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