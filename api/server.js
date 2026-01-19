// مكتبات التشغيل الأساسية
const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   1️⃣ بيانات الربط المباشرة (بدون .env) 
   انسخ البيانات دي من Supabase وحطها هنا بالظبط
================================ */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===============================
   2️⃣ الإعدادات العامة (Middlewares)
================================ */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعداد رفع الملفات (Temp storage لـ Vercel)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ===============================
   3️⃣ نظام الدخول والمراجعة (Login) - النسخة المعدلة
================================ */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    // 1. البحث في جدول users (مش students)
    const { data: user, error } = await supabase
        .from('users') 
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: "Username not found!" });
    }

    // 2. مقارنة الباسورد العادي (لأنك كاتبه بإيدك في Supabase)
    // لو حبيت تستخدم bcrypt مستقبلاً لازم تسجل الطالب بـ hashed password
    if (password !== user.password) {
        return res.status(401).json({ success: false, message: "Wrong password!" });
    }

    // 3. السماح للأدمن بالدخول حتى لو مش مفعل (is_active)
    if (user.role !== 'admin' && user.is_active === false) {
        return res.status(403).json({ 
            success: false, 
            message: "Your account is pending review by Ms. Shaimaa." 
        });
    }

    // 4. إرسال البيانات كاملة للمتصفح
    res.json({ success: true, user });
});

/* ===============================
   4️⃣ نظام التسجيل (Register) - منع تكرار الأسماء
================================ */
app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    // 1. فحص هل الاسم موجود مسبقاً في جدول users
    const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

    if (existingUser) {
        return res.status(409).json({ 
            success: false, 
            message: "This username is already taken. Please choose another one." 
        });
    }

    // 2. إدخال المستخدم الجديد (بدون تشفيرbcrypt عشان يشتغل مع كود الـ login اللي فوق)
    const { error } = await supabase.from('users').insert([{
        username,
        password: password, // نص عادي لضمان الدخول السهل
        grade,
        role: 'student',
        is_active: false 
    }]);

    if (error) return res.status(500).json({ success: false, message: "Database Error" });
    res.json({ success: true });
});

/* ===============================
   5️⃣ لوحة تحكم الأدمن (التفعيل، الحذف، الإحصائيات)
================================ */

// عرض كل الطلاب للمراجعة
app.get('/api/admin/users', async (req, res) => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

// تفعيل الطالب (بمجرد تفعيله يدخل فوراً)
app.post('/api/admin/users/activate', async (req, res) => {
    const { username, status } = req.body;
    await supabase.from('students').update({ is_active: status }).eq('username', username);
    res.json({ success: true });
});

// حذف طالب
app.delete('/api/admin/users/:username', async (req, res) => {
    await supabase.from('students').delete().eq('username', req.params.username);
    res.json({ success: true });
});

// إحصائيات عدد الطلاب
app.get('/api/admin/stats', async (req, res) => {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    res.json({ totalStudents: count || 0 });
});

/* ===============================
   6️⃣ إدارة المحتوى (دروس، امتحانات، حذف)
================================ */

// رفع درس جديد
app.post('/api/courses', upload.single('file'), async (req, res) => {
    const { title, grade, type } = req.body;
    await supabase.from('courses').insert([{
        title, grade, type, filePath: `/uploads/${req.file.filename}`
    }]);
    res.json({ success: true });
});

// حذف امتحان أو درس
app.delete('/api/content/:type/:id', async (req, res) => {
    // type ممكن يكون 'exams' أو 'courses'
    const { error } = await supabase.from(req.params.type).delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
});

// جلب كل المحتوى
app.get('/api/content', async (req, res) => {
    const { data: lessons } = await supabase.from('courses').select('*');
    const { data: exams } = await supabase.from('exams').select('*');
    res.json({ lessons: lessons || [], exams: exams || [] });
});

/* ===============================
   7️⃣ النتائج والامتحانات
================================ */
app.post('/api/exams', async (req, res) => {
    await supabase.from('exams').insert([req.body]);
    res.json({ success: true });
});

app.post('/api/results', async (req, res) => {
    await supabase.from('results').insert([{ ...req.body, date: new Date().toISOString() }]);
    res.json({ success: true });
});

app.get('/api/results', async (req, res) => {
    const { data } = await supabase.from('results').select('*');
    res.json(data || []);
});

app.delete('/api/clear-results', async (req, res) => {
    // بيمسح كل الصفوف اللي في جدول النتائج
    const { error } = await supabase.from('results').delete().neq('id', 0); 
    if (error) return res.status(500).send("Clear Error");
    res.json({ success: true, message: "تم مسح جميع النتائج بنجاح" });
});

/* ===============================
   8️⃣ تشغيل السيرفر النهائي
================================ */
module.exports = app;