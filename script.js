// ==================== CONFIGURAÇÃO ====================
const API_URL = 'https://acsqsrelatoriosapi.eurekaplatformapi.xyz';
const API_TIMEOUT = 15000;
const STORAGE_KEY = 'acqs_relatorios';
const USER_KEY = 'acqs_user';
const SYNC_KEY = 'acqs_sync';

// ==================== ESTADO ====================
let isOnline = navigator.onLine;
let syncBusy = false;
let editandoId = null;

window.addEventListener('online', () => { isOnline = true; atualizarOnline(); });
window.addEventListener('offline', () => { isOnline = false; atualizarOnline(); });

// ==================== SESSÃO ====================
function getUser() {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
}

function setUser(u) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
}

function removeUser() {
    localStorage.removeItem(USER_KEY);
}

function logado() {
    return !!getUser();
}

// ==================== FETCH ====================
async function api(endpoint, method = 'GET', body = null) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${endpoint}`, opts);
        clearTimeout(tid);
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || data.error || 'Erro desconhecido');
        return data;
    } catch (e) {
        clearTimeout(tid);
        if (e.name === 'AbortError') throw new Error('Tempo esgotado. Verifique a ligação.');
        throw e;
    }
}

// ==================== AUTH ====================
async function fazerCadastro() {
    const email = document.getElementById('cadastroEmail').value.trim();
    const password = document.getElementById('cadastroPassword').value;
    const confirm = document.getElementById('cadastroConfirm').value;

    if (!email || !password) { alert('Preencha email e senha.'); return; }
    if (password !== confirm) { alert('As senhas não coincidem.'); return; }
    if (password.length < 6) { alert('Senha deve ter no mínimo 6 caracteres.'); return; }

    mostrarLoading('Criando conta...');
    try {
        const data = await api('/api/cadastrar', 'POST', { email, password });
        setUser({ userId: data.userId, email: data.email, role: data.role });
        esconderLoading();
        toast('Conta criada com sucesso!');
        document.getElementById('cadastroEmail').value = '';
        document.getElementById('cadastroPassword').value = '';
        document.getElementById('cadastroConfirm').value = '';
        atualizarUISync();
        const rels = carregarRelatorios();
        if (rels.length > 0 && confirm('Tem relatórios locais. Enviar para a nuvem agora?')) {
            await enviarNuvem();
        }
    } catch (e) {
        esconderLoading();
        alert('Erro ao criar conta: ' + e.message);
    }
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) { alert('Preencha email e senha.'); return; }

    mostrarLoading('Fazendo login...');
    try {
        const data = await api('/api/entrar', 'POST', { email, password });
        setUser({ userId: data.userId, email: data.email, role: data.role });
        esconderLoading();
        toast('Login realizado com sucesso!');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        atualizarUISync();
        if (confirm('Deseja baixar os relatórios da nuvem?')) {
            await baixarNuvem();
        }
    } catch (e) {
        esconderLoading();
        alert('Erro ao fazer login: ' + e.message);
    }
}

function fazerLogout() {
    if (!confirm('Tem certeza que deseja sair? Os dados locais serão mantidos.')) return;
    removeUser();
    atualizarUISync();
    toast('Logout realizado.');
}

function mostrarCadastro() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('cadastroBox').style.display = 'block';
}

function mostrarLogin() {
    document.getElementById('cadastroBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
}

// ==================== SINCRONIZAÇÃO ====================
async function enviarNuvem() {
    if (!isOnline) { alert('Sem ligação à internet.'); return; }
    if (!logado()) { alert('Precisa fazer login primeiro.'); return; }
    if (syncBusy) return;
    syncBusy = true;
    mostrarLoading('Enviando para a nuvem...');
    try {
        const user = getUser();
        const relatorios = carregarRelatorios();
        const data = await api('/api/sync/upload', 'POST', { userId: user.userId, relatorios });
        localStorage.setItem(SYNC_KEY, new Date().toISOString());
        esconderLoading();
        syncBusy = false;
        toast(`${data.total} relatórios sincronizados!`);
        atualizarUISync();
    } catch (e) {
        esconderLoading();
        syncBusy = false;
        alert('Erro ao enviar: ' + e.message);
    }
}

async function baixarNuvem() {
    if (!isOnline) { alert('Sem ligação à internet.'); return; }
    if (!logado()) { alert('Precisa fazer login primeiro.'); return; }
    if (syncBusy) return;
    syncBusy = true;
    mostrarLoading('Baixando da nuvem...');
    try {
        const user = getUser();
        const data = await api(`/api/sync/download?userId=${user.userId}`);
        if (!data.relatorios || data.relatorios.length === 0) {
            esconderLoading(); syncBusy = false;
            alert('Nenhum dado encontrado na nuvem.'); return;
        }
        const locais = carregarRelatorios();
        const ids = new Set(locais.map(r => r.id));
        let novos = 0;
        data.relatorios.forEach(r => { if (!ids.has(r.id)) { locais.push(r); novos++; } });
        salvarRelatorios(locais);
        esconderLoading(); syncBusy = false;
        toast(novos > 0 ? `${novos} novos relatórios baixados!` : 'Dados já actualizados!');
    } catch (e) {
        esconderLoading(); syncBusy = false;
        alert('Erro ao baixar: ' + e.message);
    }
}

// ==================== RELATÓRIOS ====================
function carregarRelatorios() {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : [];
}

function salvarRelatorios(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function lerForm() {
    return {
        nomeCelula: v('nomeCelula'),
        localCulto: v('localCulto'),
        cultoInicio: v('cultoInicio'),
        cultoFim: v('cultoFim'),
        moderador: v('moderador'),
        intercessores: v('intercessores'),
        intercessaoInicio: v('intercessaoInicio'),
        intercessaoFim: v('intercessaoFim'),
        pontosOracao: v('pontosOracao'),
        pregadorEvangelista: v('pregadorEvangelista'),
        pregadorPrincipal: v('pregadorPrincipal'),
        temaPregacao: v('temaPregacao'),
        notasPregacao: v('notasPregacao'),
        listaPresencas: v('listaPresencas'),
        primeiraVez: parseInt(v('primeiraVez')) || 0,
        receberamJesus: parseInt(v('receberamJesus')) || 0,
        batizados: parseInt(v('batizados')) || 0,
        participantes: parseInt(v('participantes')) || 0
    };
}

function preencherForm(d) {
    sv('nomeCelula', d.nomeCelula);
    sv('localCulto', d.localCulto);
    sv('cultoInicio', d.cultoInicio);
    sv('cultoFim', d.cultoFim);
    sv('moderador', d.moderador);
    sv('intercessores', d.intercessores);
    sv('intercessaoInicio', d.intercessaoInicio);
    sv('intercessaoFim', d.intercessaoFim);
    sv('pontosOracao', d.pontosOracao);
    sv('pregadorEvangelista', d.pregadorEvangelista);
    sv('pregadorPrincipal', d.pregadorPrincipal);
    sv('temaPregacao', d.temaPregacao);
    sv('notasPregacao', d.notasPregacao);
    sv('listaPresencas', d.listaPresencas);
    sv('primeiraVez', d.primeiraVez || 0);
    sv('receberamJesus', d.receberamJesus || 0);
    sv('batizados', d.batizados || 0);
    sv('participantes', d.participantes || 0);
}

function salvarRelatorio() {
    const dados = lerForm();
    if (!dados.nomeCelula.trim()) { alert('Preencha o nome da célula.'); return; }

    const dataInput = v('dataRelatorio');
    const dataObj = dataInput ? new Date(dataInput + 'T12:00:00') : new Date();
    if (!dataInput) document.getElementById('dataRelatorio').valueAsDate = new Date();

    const lista = carregarRelatorios();

    if (editandoId !== null) {
        const idx = lista.findIndex(r => r.id === editandoId);
        if (idx !== -1) {
            lista[idx] = { id: editandoId, data: dataObj.toISOString(), dataFormatada: dataObj.toLocaleDateString('pt-BR'), mes: dataObj.getMonth() + 1, ano: dataObj.getFullYear(), dados };
            salvarRelatorios(lista);
            toast('Relatório actualizado!');
            editandoId = null;
            document.getElementById('editBanner').style.display = 'none';
            return;
        }
    }

    const novo = { id: Date.now(), data: dataObj.toISOString(), dataFormatada: dataObj.toLocaleDateString('pt-BR'), mes: dataObj.getMonth() + 1, ano: dataObj.getFullYear(), dados };
    lista.push(novo);
    salvarRelatorios(lista);
    toast('Relatório guardado!');
}

function editarRelatorio(id) {
    const r = carregarRelatorios().find(r => r.id === id);
    if (!r) return;
    editandoId = r.id;
    document.getElementById('dataRelatorio').value = new Date(r.data).toISOString().split('T')[0];
    preencherForm(r.dados);
    const b = document.getElementById('editBanner');
    b.style.display = 'flex';
    document.getElementById('editBannerText').textContent = `Editando: ${r.dataFormatada}`;
    irPara('form');
    toast('Relatório carregado para edição!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() {
    if (!confirm('Cancelar edição? Alterações não guardadas serão perdidas.')) return;
    editandoId = null;
    document.getElementById('editBanner').style.display = 'none';
    limparForm();
}

function apagarRelatorio(id) {
    if (!confirm('Apagar este relatório?')) return;
    salvarRelatorios(carregarRelatorios().filter(r => r.id !== id));
    toast('Relatório apagado!');
    renderHistorico();
}

function limparForm() {
    if (!confirm('Limpar todos os campos?')) return;
    document.getElementById('dataRelatorio').valueAsDate = new Date();
    ['nomeCelula','localCulto','cultoInicio','cultoFim','moderador','intercessores',
     'intercessaoInicio','intercessaoFim','pontosOracao','pregadorEvangelista',
     'pregadorPrincipal','temaPregacao','notasPregacao','listaPresencas'].forEach(id => sv(id, ''));
    ['primeiraVez','receberamJesus','batizados','participantes'].forEach(id => sv(id, 0));
    editandoId = null;
    document.getElementById('editBanner').style.display = 'none';
    toast('Formulário limpo!');
}

// ==================== GERAR TEXTO ====================
function gerarTexto() {
    const dataInput = v('dataRelatorio');
    const data = dataInput ? new Date(dataInput + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    const intercessores = v('intercessores').split('\n').filter(l => l.trim()).map((n, i) => `${i + 1}. ${n.trim()}`).join('\n');
    const presencas = v('listaPresencas').split('\n').filter(l => l.trim()).map(n => n.trim()).join('\n');
    const pontos = v('pontosOracao').split('\n').filter(l => l.trim()).map(p => p.trim()).join('\n');

    return `Relatório ACQS — Célula ${v('nomeCelula')}
Data: ${data}

Saudações líder!

Intercessão: ${v('intercessaoInicio')} - ${v('intercessaoFim')}
Início do culto: ${v('cultoInicio')}
Término: ${v('cultoFim')}
Moderador: ${v('moderador')}

PONTOS DE ORAÇÃO
${pontos}

MOMENTO DE INTERCESSÃO
Intercessores:
${intercessores}

MOMENTO DA PALAVRA
Pregador Evangelista: ${v('pregadorEvangelista')}
Pregador Principal: ${v('pregadorPrincipal')}
Tema: ${v('temaPregacao')}
Notas:
${v('notasPregacao')}

ESTATÍSTICAS
Lista de Presenças:
${presencas}

Resumo:
- 1ª vez: ${v('primeiraVez')} pessoa(s)
- Receberam Jesus: ${v('receberamJesus')} pessoa(s)
- Batizados: ${v('batizados')} pessoa(s)
- Total de participantes: ${v('participantes')} pessoa(s)`;
}

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(gerarTexto(), 180), 15, 15);
    doc.save(`relatorio_${v('nomeCelula') || 'acqs'}.pdf`);
}

function gerarTXT() {
    const blob = new Blob([gerarTexto()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio_${v('nomeCelula') || 'acqs'}.txt`;
    a.click();
}

function verTexto() {
    document.getElementById('modalTexto').textContent = gerarTexto();
    document.getElementById('modal').style.display = 'block';
}

function copiarTexto() {
    navigator.clipboard.writeText(document.getElementById('modalTexto').textContent)
        .then(() => toast('Copiado!'));
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

// ==================== HISTÓRICO ====================
function renderHistorico() {
    const lista = carregarRelatorios();
    const el = document.getElementById('historicoConteudo');

    if (lista.length === 0) {
        el.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Nenhum relatório guardado ainda.</p>';
        return;
    }

    const porMes = {};
    lista.forEach(r => {
        const k = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
        if (!porMes[k]) porMes[k] = [];
        porMes[k].push(r);
    });

    let html = '';
    Object.keys(porMes).sort().reverse().forEach(k => {
        const [ano, mes] = k.split('-');
        const grupo = porMes[k];
        html += `<div class="mes-grupo"><h3>${nomeMes(parseInt(mes))} ${ano} — ${grupo.length} relatório${grupo.length > 1 ? 's' : ''}</h3>`;
        grupo.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(r => {
            html += `
            <div class="relatorio-item">
                <div class="relatorio-info">
                    <strong>${r.dados.nomeCelula || 'Sem nome'}</strong>
                    <span>${r.dataFormatada}</span>
                </div>
                <div class="relatorio-acoes">
                    <button class="btn-ver" onclick="verRelatorio(${r.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn-editar" onclick="editarRelatorio(${r.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-apagar" onclick="apagarRelatorio(${r.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });
        html += '</div>';
    });
    el.innerHTML = html;
}

function verRelatorio(id) {
    const r = carregarRelatorios().find(r => r.id === id);
    if (!r) return;
    const ant = lerForm();
    preencherForm(r.dados);
    document.getElementById('dataRelatorio').value = new Date(r.data).toISOString().split('T')[0];
    const texto = gerarTexto();
    preencherForm(ant);
    document.getElementById('modalTexto').textContent = texto;
    document.getElementById('modal').style.display = 'block';
}

// ==================== ESTATÍSTICAS ====================
function renderStats() {
    const lista = carregarRelatorios();
    const el = document.getElementById('statsConteudo');

    if (lista.length === 0) {
        el.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Nenhum dado disponível.</p>';
        return;
    }

    let cultos = lista.length, pVez = 0, jesus = 0, batiz = 0, part = 0;
    lista.forEach(r => {
        pVez += r.dados.primeiraVez || 0;
        jesus += r.dados.receberamJesus || 0;
        batiz += r.dados.batizados || 0;
        part += r.dados.participantes || 0;
    });

    el.innerHTML = `
        <div class="stats-grid" style="margin-bottom:20px">
            <div class="stat-card"><i class="fas fa-calendar-check"></i><div class="num">${cultos}</div><div class="lbl">Cultos</div></div>
            <div class="stat-card"><i class="fas fa-users"></i><div class="num">${part}</div><div class="lbl">Participantes</div></div>
            <div class="stat-card"><i class="fas fa-user-plus"></i><div class="num">${pVez}</div><div class="lbl">1ª Vez</div></div>
            <div class="stat-card"><i class="fas fa-heart"></i><div class="num">${jesus}</div><div class="lbl">Receberam Jesus</div></div>
            <div class="stat-card"><i class="fas fa-water"></i><div class="num">${batiz}</div><div class="lbl">Batizados</div></div>
            <div class="stat-card"><i class="fas fa-chart-line"></i><div class="num">${(part/cultos).toFixed(1)}</div><div class="lbl">Média/Culto</div></div>
        </div>
        <div id="statsMensais"></div>`;

    const porMes = {};
    lista.forEach(r => {
        const k = `${r.ano}-${String(r.mes).padStart(2,'0')}`;
        if (!porMes[k]) porMes[k] = { cultos:0, pVez:0, jesus:0, batiz:0, part:0 };
        porMes[k].cultos++;
        porMes[k].pVez += r.dados.primeiraVez || 0;
        porMes[k].jesus += r.dados.receberamJesus || 0;
        porMes[k].batiz += r.dados.batizados || 0;
        porMes[k].part += r.dados.participantes || 0;
    });

    let html = '';
    Object.keys(porMes).sort().reverse().forEach(k => {
        const [ano, mes] = k.split('-');
        const d = porMes[k];
        html += `<div class="mes-grupo"><h3>${nomeMes(parseInt(mes))} ${ano}</h3>
            <div class="stats-grid">
                <div class="stat-card"><div class="num">${d.cultos}</div><div class="lbl">Cultos</div></div>
                <div class="stat-card"><div class="num">${d.part}</div><div class="lbl">Participantes</div></div>
                <div class="stat-card"><div class="num">${d.pVez}</div><div class="lbl">1ª Vez</div></div>
                <div class="stat-card"><div class="num">${d.jesus}</div><div class="lbl">Receberam Jesus</div></div>
                <div class="stat-card"><div class="num">${d.batiz}</div><div class="lbl">Batizados</div></div>
            </div></div>`;
    });
    document.getElementById('statsMensais').innerHTML = html;
}

// ==================== EXPORT / IMPORT ====================
function exportarJSON() {
    const lista = carregarRelatorios();
    if (lista.length === 0) { alert('Nenhum relatório para exportar.'); return; }
    const data = new Date().toISOString().split('T')[0];
    const blob = new Blob([JSON.stringify({ versao: '2.0', data, total: lista.length, relatorios: lista }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorios_acqs_${data}.json`;
    a.click();
    toast('Exportado com sucesso!');
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.relatorios || !Array.isArray(dados.relatorios)) { alert('Ficheiro inválido.'); return; }
            const existentes = carregarRelatorios();
            const ids = new Set(existentes.map(r => r.id));
            let novos = 0;
            dados.relatorios.forEach(r => { if (!ids.has(r.id)) { existentes.push(r); novos++; } });
            salvarRelatorios(existentes);
            toast(`${novos} relatório(s) importado(s)!`);
        } catch (e) { alert('Erro ao importar: ' + e.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================== NAVEGAÇÃO ====================
function irPara(pagina) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`page-${pagina}`).classList.add('active');
    const idx = ['form','historico','stats','sync'].indexOf(pagina);
    document.querySelectorAll('.nav-item')[idx]?.classList.add('active');

    if (pagina === 'historico') renderHistorico();
    if (pagina === 'stats') renderStats();
    if (pagina === 'sync') { atualizarUISync(); atualizarOnline(); }
}

// ==================== UI ====================
function atualizarUISync() {
    const user = getUser();
    document.getElementById('authBox').style.display = user ? 'none' : 'block';
    document.getElementById('syncBox').style.display = user ? 'block' : 'none';
    if (user) {
        document.getElementById('syncEmail').textContent = user.email;
        const s = localStorage.getItem(SYNC_KEY);
        document.getElementById('syncData').textContent = s ? new Date(s).toLocaleString('pt-BR') : 'Nunca';
    }
}

function atualizarOnline() {
    const dot = document.getElementById('onlineDot');
    if (dot) dot.className = 'online-dot ' + (isOnline ? 'online' : 'offline');
}

// ==================== LOADING / TOAST ====================
function mostrarLoading(msg = 'Carregando...') {
    document.getElementById('loadingMsg').textContent = msg;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function esconderLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2500);
}

// ==================== HELPERS ====================
function v(id) { return document.getElementById(id)?.value || ''; }
function sv(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function nomeMes(n) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][n-1]; }

// ==================== PWA ====================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBar').style.display = 'flex';
});

document.getElementById('btnInstall')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('installBar').style.display = 'none';
});

document.getElementById('btnDismiss')?.addEventListener('click', () => {
    document.getElementById('installBar').style.display = 'none';
});

window.addEventListener('appinstalled', () => {
    document.getElementById('installBar').style.display = 'none';
    toast('App instalado!');
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dataRelatorio').valueAsDate = new Date();
    atualizarOnline();
    atualizarUISync();

    // Sincronização automática (7 dias)
    const user = getUser();
    const s = localStorage.getItem(SYNC_KEY);
    if (user && isOnline && s) {
        const dias = (new Date() - new Date(s)) / (1000 * 60 * 60 * 24);
        if (dias >= 7) setTimeout(() => enviarNuvem(), 5000);
    }
});
