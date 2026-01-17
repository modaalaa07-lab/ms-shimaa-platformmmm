require('dotenv').config(); // تأكدت إن الـ r صغيرة 100%

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   1️⃣ الاتصال بـ Supabase (الأمان الكامل)
================================ */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE ENV VARIABLES MISSING");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===============================
   2️⃣ Middlewares (الربط والملفات)
================================ */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===============================
   3️⃣ رفع الملفات (Multer)
================================ */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'), // مناسب لبيئة Vercel
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ===============================
   4️⃣ أنظمة الدخول والتسجيل (الجديدة)
================================ */

// دالة موحدة للدخول تقبل المسارين القديم والجديد لراحتك
const loginHandler = async (req, res) => {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    // فحص الباسورد: يدعم النص العادي (لطلابك القدام) والمشفر (للجدد)
    const isMatch = (password === user.password) || await bcrypt.compare(password, user.password).catch(() => false);
    
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    // نظام القفل - المنع لو الحساب is_active = false
    if (user.is_active === false || user.is_active === null) {
        return res.status(403).json({ 
            success: false, 
            message: "حسابك قيد المراجعة. تواصل مع الإدارة لتفعيل حسابك." 
        });
    }

    res.json({ success: true, user });
};

app.post('/api/login', loginHandler);
app.post('/api/auth/login', loginHandler);

// تسجيل حساب جديد - يُخزن مشفر ومغلق أوتوماتيكياً
app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    const { data: exists } = await supabase.from('students').select('id').eq('username', username).single();
    if (exists) return res.status(409).json({ success: false, message: "اسم المستخدم موجود" });

    const hashedPassword = await bcrypt.hash(password, 10); // تشفير الباسورد

    const { error } = await supabase.from('students').insert([{
        username,
        password: hashedPassword,
        grade,
        role: 'student',
        is_active: false // الحساب يسجل وهو مغلق
    }]);

    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

/* ===============================
   5️⃣ إدارة الطلاب (لوحة التحكم)
================================ */

app.get('/api/admin/users', async (req, res) => {
    const { data } = await supabase.from('students').select('*');
    res.json(data || []);
});

// تفعيل أو إيقاف الحساب بضغطة زر
app.post('/api/admin/users/activate', async (req, res) => {
    const { username, status } = req.body;
    const { error } = await supabase.from('students').update({ is_active: status }).eq('username', username);
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

app.delete('/api/admin/users/:username', async (req, res) => {
    const { error } = await supabase.from('students').delete().eq('username', req.params.username);
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

/* ===============================
   6️⃣ الدروس والامتحانات (المحتوى)
================================ */

app.post('/api/courses', upload.single('file'), async (req, res) => {
    const { title, grade, type } = req.body;
    const { error } = await supabase.from('courses').insert([{
        title, grade, type, filePath: `/uploads/${req.file.filename}`
    }]);
    if (error) return res.status(500).send("Upload Error");
    res.json({ success: true });
});

app.get('/api/content', async (req, res) => {
    const grade = req.query.grade;
    let lessons = supabase.from('courses').select('*');
    let exams = supabase.from('exams').select('*');
    if (grade && grade !== 'all') {
        lessons = lessons.eq('grade', grade);
        exams = exams.eq('grade', grade);
    }
    const { data: l } = await lessons;
    const { data: e } = await exams;
    res.json({ lessons: l || [], exams: e || [] });
});

app.post('/api/exams', async (req, res) => {
    const { error } = await supabase.from('exams').insert([req.body]);
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

app.delete('/api/content/:type/:id', async (req, res) => {
    const { error } = await supabase.from(req.params.type).delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

/* ===============================
   7️⃣ النتائج والإحصائيات
================================ */

app.post('/api/results', async (req, res) => {
    const { error } = await supabase.from('results').insert([{ ...req.body, date: new Date().toISOString() }]);
    if (error) return res.status(500).send("Save Error");
    res.json({ success: true });
});

app.get('/api/results', async (req, res) => {
    const { data } = await supabase.from('results').select('*');
    res.json(data || []);
});

app.get('/api/admin/stats', async (req, res) => {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    res.json({ totalStudents: count || 0 });
});

/* ===============================
   8️⃣ تشغيل السيرفر
================================ */
app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال بامتياز على بورت ${PORT}`);
});

module.exports = app;