require('dotenv').config(); // تحميل env

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   1️⃣ Supabase Secure Connection
================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE ENV MISSING");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===============================
   2️⃣ Middlewares
================================ */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===============================
   3️⃣ Multer Upload (Safe)
================================ */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ===============================
   4️⃣ AUTH – LOGIN
================================ */

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user || user.password !== password) {
        return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    // السطر ده هو اللي بيعمل "القفل"
    if (user.is_active === false || user.is_active === null) {
        return res.status(403).json({ 
            success: false, 
            message: "حسابك قيد المراجعة. تواصل مع الإدارة لتفعيل حسابك." 
        });
    }

    res.json({ success: true, user });
});

/* ===============================
   5️⃣ AUTH – REGISTER
================================ */

app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    if (!username || !password || !grade) {
        return res.status(400).json({
            success: false,
            message: "بيانات التسجيل ناقصة"
        });
    }

    // Check duplicate
    const { data: exists } = await supabase
        .from('students')
        .select('id')
        .eq('username', username)
        .single();

    if (exists) {
        return res.status(409).json({
            success: false,
            message: "اسم المستخدم موجود"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('students').insert([{
        username,
        password: hashedPassword,
        grade,
        role: 'student'
    }]);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }

    res.json({ success: true });
});

/* ===============================
   6️⃣ ADMIN – USERS
================================ */

app.get('/api/admin/users', async (req, res) => {
    const { data } = await supabase.from('students').select('*');
    res.json(data || []);
});

app.delete('/api/admin/users/:username', async (req, res) => {
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('username', req.params.username);

    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

// كود لتفعيل أو إيقاف حساب طالب من لوحة التحكم
app.post('/api/admin/users/activate', async (req, res) => {
    const { username, status } = req.body; // status هيكون true للتفعيل و false للإيقاف
    
    const { error } = await supabase
        .from('students')
        .update({ is_active: status })
        .eq('username', username);

    if (error) return res.status(500).json({ success: false, message: error.message });
    
    res.json({ success: true, message: "تم تحديث حالة الحساب بنجاح" });
});

/* ===============================
   7️⃣ COURSES & EXAMS
================================ */

app.post('/api/courses', upload.single('file'), async (req, res) => {
    const { title, grade, type } = req.body;

    const { error } = await supabase.from('courses').insert([{
        title,
        grade,
        type,
        filePath: `/uploads/${req.file.filename}`
    }]);

    if (error) return res.status(500).send("Upload Error");
    res.json({ success: true });
});

app.get('/api/content', async (req, res) => {
    const grade = req.query.grade;

    let lessons = supabase.from('courses').select('*');
    let exams = supabase.from('exams').select('*');

    if (grade !== 'all') {
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
    const { error } = await supabase
        .from(req.params.type)
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

/* ===============================
   8️⃣ RESULTS
================================ */

app.post('/api/results', async (req, res) => {
    const { error } = await supabase
        .from('results')
        .insert([{ ...req.body, date: new Date().toISOString() }]);

    if (error) return res.status(500).send("Save Error");
    res.json({ success: true });
});

app.get('/api/results', async (req, res) => {
    const { data } = await supabase.from('results').select('*');
    res.json(data || []);
});

app.delete('/api/clear-results', async (req, res) => {
    const { error } = await supabase.from('results').delete().neq('id', 0);
    if (error) return res.status(500).send("Clear Error");
    res.json({ success: true });
});

/* ===============================
   9️⃣ STATS
================================ */

app.get('/api/admin/stats', async (req, res) => {
    const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

    res.json({
        totalStudents: count || 0,
        bestExam: "Connected"
    });
});

/* ===============================
   🔟 START SERVER
================================ */

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;