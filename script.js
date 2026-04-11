const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Responder a preflight requests
app.options('*', cors());


const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/acqs')
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => console.error('❌ Erro MongoDB:', err));

// ==================== SCHEMAS ====================

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const relatorioSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    relatorios: [{
        id: Number,
        data: String,
        dataFormatada: String,
        mes: Number,
        ano: Number,
        dados: {
            nomeCelula: String,
            localCulto: String,
            cultoInicio: String,
            cultoFim: String,
            moderador: String,
            intercessores: String,
            intercessaoInicio: String,
            intercessaoFim: String,
            pontosOracao: String,
            pregadorEvangelista: String,
            pregadorPrincipal: String,
            temaPregacao: String,
            notasPregacao: String,
            listaPresencas: String,
            primeiraVez: Number,
            receberamJesus: Number,
            batizados: Number,
            participantes: Number
        }
    }],
    ultimaAtualizacao: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Relatorio = mongoose.model('Relatorio', relatorioSchema);

// ==================== ROTAS PÚBLICAS ====================

app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'API ACQS funcionando', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalRelatorios = await Relatorio.aggregate([
            { $project: { count: { $size: '$relatorios' } } },
            { $group: { _id: null, total: { $sum: '$count' } } }
        ]);
        res.json({ usuarios: totalUsers, relatorios: totalRelatorios[0]?.total || 0, online: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ==================== CADASTRO SIMPLES ====================

app.post('/api/cadastrar', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ ok: false, erro: 'Email e senha são obrigatórios' });
        }

        if (password.length < 6) {
            return res.status(400).json({ ok: false, erro: 'Senha deve ter no mínimo 6 caracteres' });
        }

        const existe = await User.findOne({ email: email.toLowerCase().trim() });
        if (existe) {
            return res.status(400).json({ ok: false, erro: 'Este email já está cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            email: email.toLowerCase().trim(),
            password: hash,
            role: 'user'
        });

        res.status(201).json({
            ok: true,
            mensagem: 'Conta criada com sucesso',
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

    } catch (error) {
        console.error('Erro cadastro:', error);
        res.status(500).json({ ok: false, erro: 'Erro interno ao criar conta' });
    }
});

// ==================== LOGIN SIMPLES ====================

app.post('/api/entrar', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ ok: false, erro: 'Email e senha são obrigatórios' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ ok: false, erro: 'Email ou senha incorretos' });
        }

        const senhaCorrecta = await bcrypt.compare(password, user.password);
        if (!senhaCorrecta) {
            return res.status(401).json({ ok: false, erro: 'Email ou senha incorretos' });
        }

        res.json({
            ok: true,
            mensagem: 'Login realizado com sucesso',
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

    } catch (error) {
        console.error('Erro login:', error);
        res.status(500).json({ ok: false, erro: 'Erro interno ao fazer login' });
    }
});

// ==================== ROTAS ANTIGAS (compatibilidade) ====================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        const existe = await User.findOne({ email: email.toLowerCase().trim() });
        if (existe) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ email: email.toLowerCase().trim(), password: hash, role: 'user' });

        res.status(201).json({ message: 'Utilizador criado com sucesso', userId: user._id.toString(), email: user.email, role: user.role });

    } catch (error) {
        console.error('Erro registo:', error);
        res.status(500).json({ error: 'Erro ao criar utilizador' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        const senhaCorrecta = await bcrypt.compare(password, user.password);
        if (!senhaCorrecta) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        res.json({ message: 'Login realizado com sucesso', userId: user._id.toString(), email: user.email, role: user.role });

    } catch (error) {
        console.error('Erro login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// ==================== CRIAR ADMIN ====================

app.post('/api/setup/admin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ ok: false, erro: 'Email e senha são obrigatórios' });
        }

        const existe = await User.findOne({ email: email.toLowerCase().trim() });
        if (existe) {
            return res.status(400).json({ ok: false, erro: 'Email já cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        const admin = await User.create({ email: email.toLowerCase().trim(), password: hash, role: 'admin' });

        res.status(201).json({ ok: true, mensagem: 'Admin criado com sucesso', userId: admin._id.toString(), email: admin.email, role: admin.role });

    } catch (error) {
        console.error('Erro admin:', error);
        res.status(500).json({ ok: false, erro: 'Erro ao criar admin' });
    }
});

// ==================== RELATÓRIOS ====================

app.post('/api/sync/upload', async (req, res) => {
    try {
        const { userId, relatorios } = req.body;

        if (!userId || !Array.isArray(relatorios)) {
            return res.status(400).json({ error: 'userId e relatorios são obrigatórios' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

        let userRelatorios = await Relatorio.findOne({ userId });

        if (!userRelatorios) {
            userRelatorios = new Relatorio({ userId, relatorios, ultimaAtualizacao: new Date() });
        } else {
            const idsExistentes = new Set(userRelatorios.relatorios.map(r => r.id));
            relatorios.forEach(r => {
                if (!idsExistentes.has(r.id)) {
                    userRelatorios.relatorios.push(r);
                } else {
                    const index = userRelatorios.relatorios.findIndex(x => x.id === r.id);
                    userRelatorios.relatorios[index] = r;
                }
            });
            userRelatorios.ultimaAtualizacao = new Date();
        }

        await userRelatorios.save();

        res.json({ message: 'Relatórios sincronizados', total: userRelatorios.relatorios.length, ultimaAtualizacao: userRelatorios.ultimaAtualizacao });

    } catch (error) {
        console.error('Erro upload:', error);
        res.status(500).json({ error: 'Erro ao sincronizar' });
    }
});

app.get('/api/sync/download', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

        const userRelatorios = await Relatorio.findOne({ userId });

        if (!userRelatorios) return res.json({ relatorios: [], ultimaAtualizacao: null });

        res.json({ relatorios: userRelatorios.relatorios, ultimaAtualizacao: userRelatorios.ultimaAtualizacao });

    } catch (error) {
        console.error('Erro download:', error);
        res.status(500).json({ error: 'Erro ao baixar dados' });
    }
});

app.delete('/api/user/delete', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

        await Relatorio.deleteMany({ userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Conta eliminada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao eliminar conta' });
    }
});

// ==================== ADMIN ====================

app.get('/api/admin/relatorios', async (req, res) => {
    try {
        const { adminId } = req.query;
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const todos = await Relatorio.find().populate('userId', 'email role createdAt');
        const flat = [];
        todos.forEach(doc => {
            doc.relatorios.forEach(r => {
                flat.push({ ...r.toObject(), utilizador: { id: doc.userId._id, email: doc.userId.email } });
            });
        });

        res.json({ total: flat.length, relatorios: flat });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar relatórios' });
    }
});

app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const { adminId } = req.query;
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const usuarios = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        res.json({ usuarios, total: usuarios.length });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar utilizadores' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const { adminId } = req.query;
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const totalUsers = await User.countDocuments({ role: 'user' });
        const agregacao = await Relatorio.aggregate([
            { $unwind: '$relatorios' },
            { $group: {
                _id: null,
                totalRelatorios: { $sum: 1 },
                totalParticipantes: { $sum: '$relatorios.dados.participantes' },
                totalAlmas: { $sum: '$relatorios.dados.receberamJesus' },
                totalBatizados: { $sum: '$relatorios.dados.batizados' },
                totalPrimeiraVez: { $sum: '$relatorios.dados.primeiraVez' }
            }}
        ]);

        const stats = agregacao[0] || { totalRelatorios: 0, totalParticipantes: 0, totalAlmas: 0, totalBatizados: 0, totalPrimeiraVez: 0 };
        res.json({ utilizadores: totalUsers, ...stats, online: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

app.delete('/api/admin/usuarios/:userId', async (req, res) => {
    try {
        const { adminId } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const { userId } = req.params;
        if (userId === adminId) return res.status(400).json({ error: 'Não podes eliminar a tua própria conta' });

        await Relatorio.deleteMany({ userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Utilizador eliminado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao eliminar utilizador' });
    }
});

// ==================== ERROS ====================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor na porta ${PORT}`);
    console.log(`📋 Rotas:`);
    console.log(`   POST /api/cadastrar       ← cadastro simples`);
    console.log(`   POST /api/entrar          ← login simples`);
    console.log(`   POST /api/auth/register   ← cadastro (compatibilidade)`);
    console.log(`   POST /api/auth/login      ← login (compatibilidade)`);
    console.log(`   POST /api/setup/admin`);
    console.log(`   POST /api/sync/upload`);
    console.log(`   GET  /api/sync/download?userId=`);
    console.log(`   GET  /api/admin/relatorios?adminId=`);
    console.log(`   GET  /api/admin/usuarios?adminId=`);
    console.log(`   GET  /api/admin/stats?adminId=`);
});

setInterval(() => { console.log('⏰ Keep-alive ping'); }, 14 * 60 * 1000);
