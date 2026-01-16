document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    // إخفاء رسالة الخطأ لو كانت ظاهرة
    errorDiv.classList.add('hidden');

    try {
        // الـ fetch هنا لازم يروح لـ /api/auth/login
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            
            // التوجيه حسب الرتبة
            if (data.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/main.html';
            }
        } else {
            errorDiv.classList.remove('hidden');
            errorDiv.innerText = "Invalid username or password!";
        }
    } catch (err) {
        console.error("Connection Error:", err);
        alert("Cannot connect to server. Make sure node server.js is running.");
    }
});