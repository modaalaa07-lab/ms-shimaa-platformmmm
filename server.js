const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DATA_DIR = path.join('/tmp', 'data'); // استخدام مجلد مؤقت للكتابة في Vercel
const UPLOADS_DIR = path.join('/tmp', 'uploads');

const DB = {
    users: path.join(DATA_DIR, 'users.json'),
    courses: path.join(DATA_DIR, 'courses.json'),
    exams: path.join(DATA_DIR, 'exams.json'),
    results: path.join(DATA_DIR, 'results.json')
};

async function initStorage() {
    await fs.ensureDir(DATA_DIR);
    await fs.ensureDir(path.join(UPLOADS_DIR, 'courses'));
    for (let key in DB) {
        if (!await fs.pathExists(DB[key])) {
            await fs.writeJson(DB[key], key === 'users' ? [
                { "username": "admin", "password": "070988", "role": "admin" },
                { "username": "shimaa faisal", "password": "070988", "role": "student", "grade": "9", "status": "active" }
            ] : []);
        }
    }
}
initStorage();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp/uploads/courses'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- 4. نظام الحسابات (Auth) ---

// أ) تسجيل دخول (Login) - تم التعديل لإرسال الـ Grade
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await fs.readJson(DB.users);
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // بنبعت كل البيانات اللي محتاجها المتصفح
            res.json({ 
                success: true, 
                username: user.username, 
                role: user.role, 
                grade: user.grade || "all" 
            });
        } else {
            res.status(401).json({ success: false, message: "Wrong credentials" });
        }
    } catch (err) { res.status(500).send("Login Server Error"); }
});

// ب) إنشاء حساب (Register)
app.post('/api/auth/register', async (req, res) => {
    try {
        const users = await fs.readJson(DB.users);
        const { username, password, grade } = req.body;

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, message: "Username already exists!" });
        }

        const newUser = {
            username,
            password,
            grade,
            role: 'student',
            status: 'active' // ممكن تخليها pending لو عايز توافق عليهم الأول
        };

        users.push(newUser);
        await fs.writeJson(DB.users, users);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Registration Error"); }
});

// --- 5. نظام الإدارة (Admin Control) ---

// جلب كل المستخدمين للأدمن
app.get('/api/admin/users', async (req, res) => {
    const users = await fs.readJson(DB.users);
    res.json(users.filter(u => u.role !== 'admin'));
});

// طرد أو حذف مستخدم
app.delete('/api/admin/users/:username', async (req, res) => {
    try {
        let users = await fs.readJson(DB.users);
        users = users.filter(u => u.username !== req.params.username);
        await fs.writeJson(DB.users, users);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Error deleting user"); }
});

// --- 6. الدروس والامتحانات (Content) ---

app.post('/api/courses', upload.single('file'), async (req, res) => {
    try {
        const courses = await fs.readJson(DB.courses);
        courses.push({ id: Date.now(), ...req.body, filePath: `/uploads/courses/${req.file.filename}` });
        await fs.writeJson(DB.courses, courses);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Upload Error"); }
});

app.get('/api/content', async (req, res) => {
    const requestedGrade = req.query.grade;
    try {
        const allCourses = await fs.readJson(DB.courses);
        const allExams = await fs.readJson(DB.exams);
        
        if (requestedGrade === 'all') {
            return res.json({ lessons: allCourses, exams: allExams });
        }
        const lessons = allCourses.filter(c => c.grade == requestedGrade);
        const exams = allExams.filter(e => e.grade == requestedGrade);
        res.json({ lessons, exams });
    } catch (err) { res.json({ lessons: [], exams: [] }); }
});

app.post('/api/exams', async (req, res) => {
    try {
        const exams = await fs.readJson(DB.exams).catch(() => []);
        exams.push({ id: Date.now(), ...req.body });
        await fs.writeJson(DB.exams, exams);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Error saving exam"); }
});

// --- 7. النتائج (Results) ---

app.post('/api/results', async (req, res) => {
    try {
        const results = await fs.readJson(DB.results).catch(() => []);
        results.push({ ...req.body, date: new Date().toLocaleString('ar-EG') });
        await fs.writeJson(DB.results, results);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Error saving result"); }
});

app.get('/api/results', async (req, res) => {
    const results = await fs.readJson(DB.results).catch(() => []);
    res.json(results);
});

app.delete('/api/clear-results', async (req, res) => {
    try {
        await fs.writeJson(DB.results, []); 
        res.json({ success: true });
    } catch (err) { res.status(500).send("Clear error"); }
});

// كود جلب الإحصائيات للأدمن
app.get('/api/admin/stats', (req, res) => {
    try {
        // 1. قراءة ملف المستخدمين (تأكد من المسار صح عندك)
        const usersData = fs.readFileSync('./data/users.json', 'utf8');
        const users = JSON.parse(usersData || '[]');
        
        // 2. قراءة ملف النتائج (لو مش موجود هيدي 0)
        let results = [];
        if (fs.existsSync('./data/results.json')) {
            results = JSON.parse(fs.readFileSync('./data/results.json', 'utf8') || '[]');
        }

        // 3. حساب عدد الطلاب (اللي دورهم student)
        const studentCount = users.filter(u => u.role === 'student').length;

        // 4. نبعت البيانات للمتصفح
        res.json({
            totalStudents: studentCount,
            bestExam: results.length > 0 ? "Exams Active" : "No Exams Yet"
        });

    } catch (err) {
        console.error("Server Stats Error:", err);
        res.json({ totalStudents: 0, bestExam: "Data Error" });
    }
});

// --- 8. تشغيل السيرفر ---
app.listen(PORT, () => {
    console.log(`🚀 Server is ACTIVE on port ${PORT}`);
});

module.exports = app; // السطر ده حيوي جداً لـ Vercel