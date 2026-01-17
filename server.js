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
const SUPABASE_URL = "https://pvlmziyldmvmubhmoazd.supabase.co"; // ضع رابط مشروعك هنا
const SUPABASE_KEY = "sb_secret_0v45QnuDfQHlhhV7VzXOIw__DsKzFPy"; // ضع الـ Key الخاص بك هنا

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
   3️⃣ نظام الدخول والمراجعة (Login)
================================ */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    // البحث عن الطالب
    const { data: user, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    // التحقق من كلمة المرور
    const isMatch = (password === user.password) || await bcrypt.compare(password, user.password).catch(() => false);
    
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    // نظام المراجعة: لو الحساب is_active = false
    if (user.is_active === false) {
        return res.status(403).json({ 
            success: false, 
            message: "تم استلام بياناتك، جارِ المراجعة من قبل الإدارة. حاول الدخول لاحقاً." 
        });
    }

    res.json({ success: true, user });
});

/* ===============================
   4️⃣ نظام التسجيل الذكي (منع التكرار)
================================ */
app.post('/api/auth/register', async (req, res) => {
    const { username, password, grade } = req.body;

    // فحص لو الاسم موجود قبل كدة
    const { data: exists } = await supabase
        .from('students')
        .select('username')
        .eq('username', username)
        .single();

    if (exists) {
        return res.status(409).json({ 
            success: false, 
            message: "اسم المستخدم هذا محجوز، من فضلك اختر اسماً آخر أو أضف رقماً بجانبه." 
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('students').insert([{
        username,
        password: hashedPassword,
        grade,
        role: 'student',
        is_active: false // يسجل ويبقى في الانتظار حتى تفعله أنت
    }]);

    if (error) return res.status(500).json({ success: false });
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
app.listen(PORT, () => console.log(`🚀 السيرفر جاهز تماماً على بورت ${PORT}`));
module.exports = app;