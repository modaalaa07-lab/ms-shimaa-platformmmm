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

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعداد رفع الملفات (Temp storage لـ Vercel)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ===============================
   1️⃣ نظام الدخول (Login)
================================ */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // 1️⃣ الحل القاطع: لو ده حسابك، ادخل أدمن فوراً من غير ما نسأل قاعدة البيانات
    if (username === "Mohamed Morsy" && password === "123") {
        return res.json({ 
            success: true, 
            user: { username: "Mohamed Morsy", role: "admin", is_active: true } 
        });
    }

    // 2️⃣ لو حد تاني، السيرفر هيدور في الجدول عادي
    const { data: user, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: "بيانات غلط" });
    }

    const isMatch = await bcrypt.compare(password, user.password).catch(() => password === user.password);
    if (!isMatch) return res.status(401).json({ success: false });

    if (user.role !== 'admin' && user.is_active === false) {
        return res.status(403).json({ success: false, message: "انتظر التفعيل" });
    }

    res.json({ success: true, user });
});

/* ===============================
   4️⃣ نظام التسجيل (Register) - النسخة المعتمدة
================================ */
app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    // 1. فحص لو الاسم موجود قبل كدة في جدول students
    const { data: exists } = await supabase
        .from('students') // التعديل: التأكد من استخدام students بدل users
        .select('username')
        .eq('username', username)
        .maybeSingle(); 

    if (exists) {
        return res.status(409).json({ 
            success: false, 
            message: "اسم المستخدم هذا محجوز، من فضلك اختر اسماً آخر." 
        });
    }

    // 2. تشفير الباسورد للحماية
    const hashed = await bcrypt.hash(password, 10);

    // 3. إدخال البيانات للأعمدة (username, password, grade, role, is_active)
    const { error } = await supabase.from('students').insert([{
        username: username,
        password: hashed,
        grade: grade,
        role: 'student', // أي حد بيسجل جديد بيكون طالب
        is_active: false // بيبقى غير مفعل لحد ما تفعلة أنت
    }]);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Database Error" });
    }
    
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

// --- حتة الأدمن اللي ناقصة في السيرفر ---

// 1. جلب كل الطلاب وباسورداتهم (للأدمن فقط)
app.get('/api/admin/students', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('students') // تأكد إن اسم الجدول 'students'
            .select('id, username, password, grade') // بنجيب الباسورد عشان تشوفه
            .order('username', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'تعذر جلب الطلاب: ' + err.message });
    }
});

// 2. رفع درس جديد لقاعدة البيانات
app.post('/api/lessons/upload', async (req, res) => {
    const { title, videoUrl, grade, desc } = req.body;
    
    if (!title || !videoUrl || !grade) {
        return res.status(400).json({ error: 'برجاء ملء جميع الخانات الأساسية' });
    }

    try {
        const { data, error } = await supabase
            .from('lessons') // تأكد إن عندك جدول اسمه 'lessons'
            .insert([{ 
                title, 
                video_url: videoUrl, 
                grade, 
                description: desc,
                created_at: new Date() 
            }]);

        if (error) throw error;
        res.status(200).json({ success: true, message: 'تم رفع الدرس بنجاح' });
    } catch (err) {
        res.status(500).json({ error: 'فشل رفع الدرس: ' + err.message });
    }
});

// 3. جلب نتائج الامتحانات
app.get('/api/admin/results', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('results')
            .select('student_name, exam_title, score, date'); // تأكد إن دي أسامي الأعمدة في Supabase

        if (error) throw error;

        // تحويل الأسماء عشان الـ Frontend يفهمها (Mapping)
        const formattedData = data.map(r => ({
            studentName: r.student_name,
            examTitle: r.exam_title,
            score: r.score,
            created_at: r.date
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إضافة Route الإحصائيات اللي كان ناقص
app.get('/api/admin/stats', async (req, res) => {
    try {
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: lessonCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
        
        res.json({
            totalStudents: studentCount || 0,
            totalLessons: lessonCount || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. حذف طالب نهائياً
app.delete('/api/admin/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'فشل حذف الطالب' });
    }
});

/* ===============================
   8️⃣ تشغيل السيرفر النهائي
================================ */
module.exports = app;