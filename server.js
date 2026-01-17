require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   Supabase Connection (SECURE)
================================ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE ENV VARIABLES MISSING");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===============================
   Middlewares
================================ */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ===============================
   Multer (Uploads)
================================ */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ===============================
   AUTH – LOGIN
================================ */

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.is_active === false) {
        return res.status(403).json({
            success: false,
            message: "Account pending activation"
        });
    }

    res.json({
        success: true,
        username: user.username,
        role: user.role,
        grade: user.grade
    });
});

/* ===============================
   AUTH – REGISTER
================================ */

app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    if (!username || !password || !grade) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    const { data: exists } = await supabase
        .from('students')
        .select('id')
        .eq('username', username)
        .single();

    if (exists) {
        return res.status(409).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('students').insert([{
        username,
        password: hashedPassword,
        grade,
        role: 'student',
        is_active: false
    }]);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }

    res.json({ success: true });
});

/* ===============================
   ADMIN – USERS
================================ */

app.get('/api/admin/users', async (req, res) => {
    const { data } = await supabase.from('students').select('*');
    res.json(data || []);
});

app.post('/api/admin/users/activate', async (req, res) => {
    const { username, status } = req.body;

    const { error } = await supabase
        .from('students')
        .update({ is_active: status })
        .eq('username', username);

    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

/* ===============================
   COURSES / EXAMS
================================ */

app.post('/api/courses', upload.single('file'), async (req, res) => {
    const { title, grade, type } = req.body;

    const { error } = await supabase.from('courses').insert([{
        title,
        grade,
        type,
        filePath: req.file ? `/uploads/${req.file.filename}` : null
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

/* ===============================
   RESULTS
================================ */

app.post('/api/results', async (req, res) => {
    const { error } = await supabase.from('results').insert([{
        ...req.body,
        date: new Date().toISOString()
    }]);

    if (error) return res.status(500).send("Save Error");
    res.json({ success: true });
});

/* ===============================
   STATS
================================ */

app.get('/api/admin/stats', async (req, res) => {
    const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

    res.json({ totalStudents: count || 0 });
});

/* ===============================
   START
================================ */

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;