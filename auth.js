document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // السطور دي لازم تطابق الـ IDs اللي في الـ HTML بتاعك
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    errorDiv.classList.add('hidden');

    try {
        // نستخدم رابط نسبي عشان يشتغل على Vercel أوتوماتيك
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

     if (response.ok && data.success) {
    localStorage.setItem('user', JSON.stringify(data.user)); 
    
    // توجيه صارم
    if (data.user.role === 'admin' || data.user.username === "Mohamed Morsy") {
        window.location.replace('admin.html'); // استخدم replace بدل href عشان ميرجعش لورا
    } else {
        window.location.replace('main.html');
    }
}  else {
    // لو فيه غلط اظهر الرسالة
    errorDiv.classList.remove('hidden');
    errorDiv.innerText = data.message || "Invalid username or password!";
}
    } catch (err) {
        console.error("Connection Error:", err);
        // التعديل هنا: شلنا أي سيرة لـ localhost عشان الرسالة المزعجة تختفي
        alert("عذراً، فشل الاتصال بالمنصة. تأكد من جودة الإنترنت.");
    }
});