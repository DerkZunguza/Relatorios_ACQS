// Sistema de armazenamento local
const STORAGE_KEY = 'relatorios_celula';
const USER_ID_KEY = 'acqs_user_id';
const EMAIL_KEY = 'acqs_user_email';
const ROLE_KEY = 'acqs_user_role';
const SYNC_KEY = 'acqs_last_sync';

// Configuração da API
const API_URL = 'https://acsqsrelatoriosapi.eurekaplatformapi.xyz';
const API_TIMEOUT = 10000;

// Estado da conexão
let isOnline = navigator.onLine;
let syncInProgress = false;

window.addEventListener('online', () => {
    isOnline = true;
    atualizarStatusConexao();
});

window.addEventListener('offline', () => {
    isOnline = false;
    atualizarStatusConexao();
});

function atualizarStatusConexao() {
    const indicator = document.getElementById('onlineIndicator');
    if (indicator) {
        indicator.className = isOnline ? 'online-indicator online' : 'online-indicator offline';
        indicator.title = isOnline ? 'Online' : 'Offline';
    }
}

// ==================== AUTH (sem JWT) ====================

function getUserId() {
    return localStorage.getItem(USER_ID_KEY);
}

function setUserId(id) {
    localStorage.setItem(USER_ID_KEY, id);
}

function getUserEmail() {
    return localStorage.getItem(EMAIL_KEY);
}

function setUserEmail(email) {
    localStorage.setItem(EMAIL_KEY, email);
}

function getUserRole() {
    return localStorage.getItem(ROLE_KEY);
}

function setUserRole(role) {
    localStorage.setItem(ROLE_KEY, role);
}

function removeSession() {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROLE_KEY);
}

function isLoggedIn() {
    return !!getUserId();
}

// ==================== FETCH COM TIMEOUT ====================

async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ==================== REGISTO ====================

async function registrarUsuario(email, password) {
    if (!isOnline) throw new Error('Sem conexão com a internet');

    mostrarLoading('Criando conta...');

    try {
        const response = await fetchWithTimeout(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao criar conta');

        setUserId(data.userId);
        setUserEmail(data.email);
        setUserRole(data.role);

        esconderLoading();
        return data;

    } catch (error) {
        esconderLoading();
        if (error.name === 'AbortError') throw new Error('Tempo esgotado. Tente novamente.');
        throw error;
    }
}

// ==================== LOGIN ====================

async function fazerLogin(email, password) {
    if (!isOnline) throw new Error('Sem conexão com a internet');

    mostrarLoading('Fazendo login...');

    try {
        const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao fazer login');

        setUserId(data.userId);
        setUserEmail(data.email);
        setUserRole(data.role);

        esconderLoading();
        return data;

    } catch (error) {
        esconderLoading();
        if (error.name === 'AbortError') throw new Error('Tempo esgotado. Tente novamente.');
        throw error;
    }
}

// ==================== LOGOUT ====================

function fazerLogout() {
    if (confirm('Tem certeza que deseja sair? Os dados locais serão mantidos.')) {
        removeSession();
        atualizarUIAuth();
        mostrarMensagemSucesso('Logout realizado com sucesso!');
    }
}

// ==================== NAVEGAÇÃO ====================

function mostrarPagina(pagina) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (pagina === 'form') {
        document.getElementById('page-form').classList.add('active');
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    } else if (pagina === 'historico') {
        document.getElementById('page-historico').classList.add('active');
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        carregarHistorico();
    } else if (pagina === 'stats') {
        document.getElementById('page-stats').classList.add('active');
        document.querySelector('.nav-item:nth-child(3)').classList.add('active');
        carregarEstatisticas();
    } else if (pagina === 'sync') {
        document.getElementById('page-sync').classList.add('active');
        document.querySelector('.nav-item:nth-child(4)').classList.add('active');
        atualizarPaginaSync();
    }
}

// ==================== SINCRONIZAÇÃO ====================

async function sincronizarParaNuvem() {
    if (!isOnline) { alert('Sem conexão com a internet.'); return; }
    if (!isLoggedIn()) { alert('Você precisa fazer login primeiro!'); mostrarPagina('sync'); return; }
    if (syncInProgress) return;

    syncInProgress = true;
    mostrarLoading('Sincronizando com a nuvem...');

    try {
        const relatorios = carregarRelatorios();

        const response = await fetchWithTimeout(`${API_URL}/api/sync/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getUserId(), relatorios })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar');

        localStorage.setItem(SYNC_KEY, new Date().toISOString());

        esconderLoading();
        syncInProgress = false;
        mostrarMensagemSucesso(`Sincronizado! ${data.total} relatórios na nuvem.`);
        atualizarUIAuth();

    } catch (error) {
        esconderLoading();
        syncInProgress = false;
        alert('Erro ao sincronizar: ' + error.message);
    }
}

async function baixarDaNuvem() {
    if (!isOnline) { alert('Sem conexão com a internet.'); return; }
    if (!isLoggedIn()) { alert('Você precisa fazer login primeiro!'); return; }
    if (syncInProgress) return;

    syncInProgress = true;
    mostrarLoading('Baixando dados da nuvem...');

    try {
        const response = await fetchWithTimeout(
            `${API_URL}/api/sync/download?userId=${getUserId()}`,
            { method: 'GET' }
        );

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao baixar dados');

        if (data.relatorios.length === 0) {
            esconderLoading();
            syncInProgress = false;
            alert('Nenhum dado encontrado na nuvem.');
            return;
        }

        const relatoriosLocais = carregarRelatorios();
        const idsLocais = new Set(relatoriosLocais.map(r => r.id));

        let novos = 0;
        data.relatorios.forEach(relatorio => {
            if (!idsLocais.has(relatorio.id)) {
                relatoriosLocais.push(relatorio);
                novos++;
            }
        });

        salvarRelatorios(relatoriosLocais);

        esconderLoading();
        syncInProgress = false;

        mostrarMensagemSucesso(novos > 0 ? `${novos} novos relatórios baixados!` : 'Dados já estão atualizados!');

        if (document.getElementById('page-historico').classList.contains('active')) {
            carregarHistorico();
        }

    } catch (error) {
        esconderLoading();
        syncInProgress = false;
        alert('Erro ao baixar: ' + error.message);
    }
}

function verificarSincronizacaoAutomatica() {
    if (!isLoggedIn() || !isOnline) return;

    const ultimaSync = localStorage.getItem(SYNC_KEY);
    if (!ultimaSync) return;

    const diasPassados = (new Date() - new Date(ultimaSync)) / (1000 * 60 * 60 * 24);
    if (diasPassados >= 7) sincronizarParaNuvem();
}

window.addEventListener('load', () => {
    setTimeout(() => verificarSincronizacaoAutomatica(), 5000);
});

// ==================== UI AUTH ====================

function atualizarUIAuth() {
    const authSection = document.getElementById('authSection');
    const syncSection = document.getElementById('syncSection');
    const userEmailEl = document.getElementById('userEmail');
    const lastSyncEl = document.getElementById('lastSync');

    if (isLoggedIn()) {
        authSection.style.display = 'none';
        syncSection.style.display = 'block';
        userEmailEl.textContent = getUserEmail();

        const ultimaSync = localStorage.getItem(SYNC_KEY);
        if (ultimaSync) {
            const data = new Date(ultimaSync);
            lastSyncEl.textContent = data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR');
        } else {
            lastSyncEl.textContent = 'Nunca';
        }
    } else {
        authSection.style.display = 'block';
        syncSection.style.display = 'none';
    }
}

function atualizarPaginaSync() {
    atualizarUIAuth();
    atualizarStatusConexao();
}

function mostrarFormRegistro() {
    document.getElementById('loginFormWrapper').style.display = 'none';
    document.getElementById('registerFormWrapper').style.display = 'block';
}

function mostrarFormLogin() {
    document.getElementById('registerFormWrapper').style.display = 'none';
    document.getElementById('loginFormWrapper').style.display = 'block';
}

async function processarRegistro(event) {
    event.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) { alert('As senhas não coincidem!'); return; }
    if (password.length < 6) { alert('A senha deve ter no mínimo 6 caracteres!'); return; }

    try {
        await registrarUsuario(email, password);
        mostrarMensagemSucesso('Conta criada com sucesso!');

        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        atualizarUIAuth();

        if (carregarRelatorios().length > 0) {
            if (confirm('Você tem relatórios salvos localmente. Deseja enviá-los para a nuvem agora?')) {
                await sincronizarParaNuvem();
            }
        }
    } catch (error) {
        alert('Erro ao criar conta: ' + error.message);
    }
}

async function processarLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await fazerLogin(email, password);
        mostrarMensagemSucesso('Login realizado com sucesso!');

        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';

        atualizarUIAuth();

        if (confirm('Deseja baixar seus relatórios salvos na nuvem?')) {
            await baixarDaNuvem();
        }
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
}

// ==================== LOADING ====================

function mostrarLoading(mensagem = 'Carregando...') {
    let loading = document.getElementById('loadingOverlay');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-circle-notch fa-spin"></i>
                <p id="loadingMessage">${mensagem}</p>
            </div>
        `;
        document.body.appendChild(loading);
    } else {
        document.getElementById('loadingMessage').textContent = mensagem;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

// ==================== RELATÓRIOS ====================

function carregarRelatorios() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

function salvarRelatorios(relatorios) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relatorios));
}

function obterDadosFormulario() {
    return {
        nomeCelula: document.getElementById('nomeCelula').value,
        localCulto: document.getElementById('localCulto').value,
        cultoInicio: document.getElementById('cultoInicio').value,
        cultoFim: document.getElementById('cultoFim').value,
        moderador: document.getElementById('moderador').value,
        intercessores: document.getElementById('intercessores').value,
        intercessaoInicio: document.getElementById('intercessaoInicio').value,
        intercessaoFim: document.getElementById('intercessaoFim').value,
        pontosOracao: document.getElementById('pontosOracao').value,
        pregadorEvangelista: document.getElementById('pregadorEvangelista').value,
        pregadorPrincipal: document.getElementById('pregadorPrincipal').value,
        temaPregacao: document.getElementById('temaPregacao').value,
        notasPregacao: document.getElementById('notasPregacao').value,
        listaPresencas: document.getElementById('listaPresencas').value,
        primeiraVez: parseInt(document.getElementById('primeiraVez').value) || 0,
        receberamJesus: parseInt(document.getElementById('receberamJesus').value) || 0,
        batizados: parseInt(document.getElementById('batizados').value) || 0,
        participantes: parseInt(document.getElementById('participantes').value) || 0
    };
}

function preencherFormulario(dados) {
    document.getElementById('nomeCelula').value = dados.nomeCelula || '';
    document.getElementById('localCulto').value = dados.localCulto || '';
    document.getElementById('cultoInicio').value = dados.cultoInicio || '';
    document.getElementById('cultoFim').value = dados.cultoFim || '';
    document.getElementById('moderador').value = dados.moderador || '';
    document.getElementById('intercessores').value = dados.intercessores || '';
    document.getElementById('intercessaoInicio').value = dados.intercessaoInicio || '';
    document.getElementById('intercessaoFim').value = dados.intercessaoFim || '';
    document.getElementById('pontosOracao').value = dados.pontosOracao || '';
    document.getElementById('pregadorEvangelista').value = dados.pregadorEvangelista || '';
    document.getElementById('pregadorPrincipal').value = dados.pregadorPrincipal || '';
    document.getElementById('temaPregacao').value = dados.temaPregacao || '';
    document.getElementById('notasPregacao').value = dados.notasPregacao || '';
    document.getElementById('listaPresencas').value = dados.listaPresencas || '';
    document.getElementById('primeiraVez').value = dados.primeiraVez || '0';
    document.getElementById('receberamJesus').value = dados.receberamJesus || '0';
    document.getElementById('batizados').value = dados.batizados || '0';
    document.getElementById('participantes').value = dados.participantes || '0';
}

let relatorioEmEdicao = null;

function salvarRelatorioAtual() {
    const dados = obterDadosFormulario();

    if (!dados.nomeCelula.trim()) {
        alert('Por favor, preencha o nome da célula antes de salvar.');
        return;
    }

    const dataInput = document.getElementById('dataRelatorio').value;
    let dataRelatorio;

    if (dataInput) {
        dataRelatorio = new Date(dataInput + 'T12:00:00');
    } else {
        dataRelatorio = new Date();
        document.getElementById('dataRelatorio').valueAsDate = dataRelatorio;
    }

    const relatorios = carregarRelatorios();

    if (relatorioEmEdicao !== null) {
        const index = relatorios.findIndex(r => r.id === relatorioEmEdicao);
        if (index !== -1) {
            relatorios[index] = {
                id: relatorioEmEdicao,
                data: dataRelatorio.toISOString(),
                dataFormatada: dataRelatorio.toLocaleDateString('pt-BR'),
                mes: dataRelatorio.getMonth() + 1,
                ano: dataRelatorio.getFullYear(),
                dados: dados
            };

            salvarRelatorios(relatorios);
            mostrarMensagemSucesso('Relatório atualizado com sucesso!');

            relatorioEmEdicao = null;
            document.getElementById('editMode').style.display = 'none';
            return;
        }
    }

    const relatorio = {
        id: Date.now(),
        data: dataRelatorio.toISOString(),
        dataFormatada: dataRelatorio.toLocaleDateString('pt-BR'),
        mes: dataRelatorio.getMonth() + 1,
        ano: dataRelatorio.getFullYear(),
        dados: dados
    };

    relatorios.push(relatorio);
    salvarRelatorios(relatorios);
    mostrarMensagemSucesso('Relatório salvo com sucesso!');
    return relatorio;
}

function gerarTextoRelatorio() {
    const dataInput = document.getElementById('dataRelatorio').value;
    let data;

    if (dataInput) {
        data = new Date(dataInput + 'T12:00:00').toLocaleDateString('pt-BR');
    } else {
        data = new Date().toLocaleDateString('pt-BR');
    }

    const intercessoresRaw = document.getElementById('intercessores').value;
    const intercessoresFormatados = intercessoresRaw.split('\n')
        .filter(l => l.trim())
        .map((nome, i) => `${i + 1}.${nome.trim()}`)
        .join('\n');

    const presencasRaw = document.getElementById('listaPresencas').value;
    const presencasFormatadas = presencasRaw.split('\n')
        .filter(l => l.trim())
        .map(nome => nome.trim())
        .join('\n');

    const pontosRaw = document.getElementById('pontosOracao').value;
    const pontosFormatados = pontosRaw.split('\n')
        .filter(l => l.trim())
        .map(p => p.trim())
        .join('\n');

    return `Relatório, ACQS Célula ${document.getElementById('nomeCelula').value}
Data:${data}

Saudações líder!

Intercessão: ${document.getElementById('intercessaoInicio').value}-${document.getElementById('intercessaoFim').value}
Início do culto: ${document.getElementById('cultoInicio').value}.
Término: ${document.getElementById('cultoFim').value}

O culto foi moderado por: ${document.getElementById('moderador').value}

Pontos de Oração:

${pontosFormatados}


MOMENTO DE INTERCESSÃO
Intercessores: 
${intercessoresFormatados}


MOMENTO DA PALAVRA
Pregador Evangelistico: ${document.getElementById('pregadorEvangelista').value}
Pregador Principal: ${document.getElementById('pregadorPrincipal').value}

Tema da Pregação: ${document.getElementById('temaPregacao').value}
Notas da Pregação:

${document.getElementById('notasPregacao').value}

ESTATÍSTICA

Lista de Presenças:

${presencasFormatadas}

Resumo:
- 1ª vez: ${document.getElementById('primeiraVez').value} pessoa(s)
- Receberam Jesus: ${document.getElementById('receberamJesus').value} pessoa(s)
- Batizados: ${document.getElementById('batizados').value} pessoa(s)
- Total de Participantes: ${document.getElementById('participantes').value} pessoa(s)`;
}

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const texto = gerarTextoRelatorio();
    const linhas = doc.splitTextToSize(texto, 180);
    doc.text(linhas, 15, 15);
    doc.save(`relatorio_${document.getElementById('nomeCelula').value}.pdf`);
}

function gerarTXT() {
    const texto = gerarTextoRelatorio();
    const blob = new Blob([texto], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${document.getElementById('nomeCelula').value}.txt`;
    link.click();
}

function mostrarTexto() {
    document.getElementById('relatorioTexto').textContent = gerarTextoRelatorio();
    document.getElementById('modal').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

function copiarTexto() {
    navigator.clipboard.writeText(document.getElementById('relatorioTexto').textContent)
        .then(() => mostrarMensagemSucesso('Texto copiado!'));
}

function mostrarMensagemSucesso(mensagem) {
    const msg = document.getElementById('successMessage');
    msg.textContent = mensagem;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
}

function exportarRelatorios() {
    const relatorios = carregarRelatorios();
    if (relatorios.length === 0) { alert('Não há relatórios para exportar.'); return; }

    const dataExportacao = new Date().toISOString().split('T')[0];
    const dados = { versao: '1.0', dataExportacao, totalRelatorios: relatorios.length, relatorios };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorios_backup_${dataExportacao}.json`;
    link.click();

    mostrarMensagemSucesso('Relatórios exportados!');
}

function importarRelatorios(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.relatorios || !Array.isArray(dados.relatorios)) {
                alert('Arquivo JSON inválido.');
                return;
            }

            const relatoriosExistentes = carregarRelatorios();
            const idsExistentes = new Set(relatoriosExistentes.map(r => r.id));

            let novos = 0;
            dados.relatorios.forEach(relatorio => {
                if (!idsExistentes.has(relatorio.id)) {
                    relatoriosExistentes.push(relatorio);
                    novos++;
                }
            });

            salvarRelatorios(relatoriosExistentes);
            mostrarMensagemSucesso(`${novos} relatório(s) importado(s)!`);
        } catch (erro) {
            alert('Erro ao importar: ' + erro.message);
        }
    };
    reader.readAsText(arquivo);
    event.target.value = '';
}

function carregarHistorico() {
    const relatorios = carregarRelatorios();

    if (relatorios.length === 0) {
        document.getElementById('historicoConteudo').innerHTML = '<p style="text-align:center;padding:40px;">Nenhum relatório salvo ainda.</p>';
        return;
    }

    const porAnoMes = {};
    relatorios.forEach(relatorio => {
        const chave = `${relatorio.ano}-${String(relatorio.mes).padStart(2, '0')}`;
        if (!porAnoMes[chave]) porAnoMes[chave] = [];
        porAnoMes[chave].push(relatorio);
    });

    let html = '';
    Object.keys(porAnoMes).sort().reverse().forEach(chave => {
        const [ano, mes] = chave.split('-');
        const nomeMes = obterNomeMes(parseInt(mes));
        const relatoriosMes = porAnoMes[chave];

        html += `
            <div class="mes-grupo">
                <h3>${nomeMes} ${ano} (${relatoriosMes.length} relatório${relatoriosMes.length > 1 ? 's' : ''})</h3>
                <div class="relatorios-lista">
        `;

        relatoriosMes.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(relatorio => {
            html += `
                <div class="relatorio-item">
                    <div class="relatorio-info">
                        <strong>${relatorio.dados.nomeCelula || 'Sem nome'}</strong>
                        <span>${relatorio.dataFormatada}</span>
                    </div>
                    <div class="relatorio-acoes">
                        <button onclick="visualizarRelatorio(${relatorio.id})" class="btn-secundario">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="carregarRelatorio(${relatorio.id})" class="btn-secundario">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="excluirRelatorio(${relatorio.id})" class="btn-perigo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    document.getElementById('historicoConteudo').innerHTML = html;
}

function obterNomeMes(numeroMes) {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return meses[numeroMes - 1];
}

function visualizarRelatorio(id) {
    const relatorio = carregarRelatorios().find(r => r.id === id);
    if (!relatorio) { alert('Relatório não encontrado.'); return; }

    const dadosAntigos = obterDadosFormulario();
    preencherFormulario(relatorio.dados);
    const textoRelatorio = gerarTextoRelatorio();
    preencherFormulario(dadosAntigos);

    document.getElementById('relatorioTexto').textContent = textoRelatorio;
    document.getElementById('modal').style.display = 'block';
}

function carregarRelatorio(id) {
    const relatorio = carregarRelatorios().find(r => r.id === id);
    if (!relatorio) { alert('Relatório não encontrado.'); return; }

    relatorioEmEdicao = relatorio.id;

    const dataStr = new Date(relatorio.data).toISOString().split('T')[0];
    document.getElementById('dataRelatorio').value = dataStr;
    preencherFormulario(relatorio.dados);

    let editMode = document.getElementById('editMode');
    if (!editMode) {
        editMode = document.createElement('div');
        editMode.id = 'editMode';
        editMode.className = 'edit-mode-banner';
        editMode.innerHTML = `
            <i class="fas fa-edit"></i>
            <span>Editando relatório de ${relatorio.dataFormatada}</span>
            <button onclick="cancelarEdicao()" class="btn-secundario" style="margin:0;padding:5px 10px;">
                <i class="fas fa-times"></i> Cancelar
            </button>
        `;
        document.querySelector('.toolbar').appendChild(editMode);
    } else {
        editMode.style.display = 'flex';
        editMode.querySelector('span').textContent = `Editando relatório de ${relatorio.dataFormatada}`;
    }

    mostrarPagina('form');
    mostrarMensagemSucesso('Relatório carregado para edição!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() {
    if (confirm('Deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
        relatorioEmEdicao = null;
        document.getElementById('editMode').style.display = 'none';
        limparFormulario();
        mostrarMensagemSucesso('Edição cancelada');
    }
}

function excluirRelatorio(id) {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    const novaLista = carregarRelatorios().filter(r => r.id !== id);
    salvarRelatorios(novaLista);
    mostrarMensagemSucesso('Relatório excluído!');
    carregarHistorico();
}

function limparFormulario() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('relatorioForm').reset();
        document.getElementById('dataRelatorio').valueAsDate = new Date();

        relatorioEmEdicao = null;
        const editMode = document.getElementById('editMode');
        if (editMode) editMode.style.display = 'none';

        mostrarMensagemSucesso('Formulário limpo!');
    }
}

function carregarEstatisticas() {
    const relatorios = carregarRelatorios();

    if (relatorios.length === 0) {
        document.getElementById('statsConteudo').innerHTML = '<p style="text-align:center;padding:40px;">Nenhum dado disponível ainda.</p>';
        return;
    }

    let totalCultos = relatorios.length;
    let totalPrimeiraVez = 0, totalReceberamJesus = 0, totalBatizados = 0, totalParticipantes = 0;

    relatorios.forEach(r => {
        totalPrimeiraVez += r.dados.primeiraVez || 0;
        totalReceberamJesus += r.dados.receberamJesus || 0;
        totalBatizados += r.dados.batizados || 0;
        totalParticipantes += r.dados.participantes || 0;
    });

    const mediaParticipantes = (totalParticipantes / totalCultos).toFixed(1);

    const html = `
        <div class="stats-grid">
            <div class="stat-card"><i class="fas fa-calendar-check"></i><div class="number">${totalCultos}</div><div class="label">Total de Cultos</div></div>
            <div class="stat-card"><i class="fas fa-user-plus"></i><div class="number">${totalPrimeiraVez}</div><div class="label">Pessoas 1ª Vez</div></div>
            <div class="stat-card"><i class="fas fa-heart"></i><div class="number">${totalReceberamJesus}</div><div class="label">Receberam Jesus</div></div>
            <div class="stat-card"><i class="fas fa-water"></i><div class="number">${totalBatizados}</div><div class="label">Batizados</div></div>
            <div class="stat-card"><i class="fas fa-users"></i><div class="number">${totalParticipantes}</div><div class="label">Total Participantes</div></div>
            <div class="stat-card"><i class="fas fa-chart-line"></i><div class="number">${mediaParticipantes}</div><div class="label">Média por Culto</div></div>
        </div>
        <h2 style="margin-top:30px;">Estatísticas por Mês</h2>
        <div id="statsMensais"></div>
    `;

    document.getElementById('statsConteudo').innerHTML = html;

    const porMes = {};
    relatorios.forEach(r => {
        const chave = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
        if (!porMes[chave]) porMes[chave] = { cultos: 0, primeiraVez: 0, receberamJesus: 0, batizados: 0, participantes: 0 };
        porMes[chave].cultos++;
        porMes[chave].primeiraVez += r.dados.primeiraVez || 0;
        porMes[chave].receberamJesus += r.dados.receberamJesus || 0;
        porMes[chave].batizados += r.dados.batizados || 0;
        porMes[chave].participantes += r.dados.participantes || 0;
    });

    let htmlMensais = '';
    Object.keys(porMes).sort().reverse().forEach(chave => {
        const [ano, mes] = chave.split('-');
        const d = porMes[chave];
        htmlMensais += `
            <div class="mes-grupo">
                <h3>${obterNomeMes(parseInt(mes))} ${ano}</h3>
                <div class="stats-grid">
                    <div class="stat-card"><div class="number">${d.cultos}</div><div class="label">Cultos</div></div>
                    <div class="stat-card"><div class="number">${d.primeiraVez}</div><div class="label">1ª Vez</div></div>
                    <div class="stat-card"><div class="number">${d.receberamJesus}</div><div class="label">Receberam Jesus</div></div>
                    <div class="stat-card"><div class="number">${d.batizados}</div><div class="label">Batizados</div></div>
                </div>
            </div>
        `;
    });

    document.getElementById('statsMensais').innerHTML = htmlMensais;
}

// ==================== SERVICE WORKER ====================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registrado'))
            .catch(err => console.log('Erro SW:', err));
    });
}

// ==================== INIT ====================

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dataRelatorio').valueAsDate = new Date();
    atualizarStatusConexao();
});

// ==================== PWA INSTALL ====================

let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installButton = document.getElementById('installButton');
const dismissInstall = document.getElementById('dismissInstall');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (!deferredPrompt) { mostrarInstrucoesInstalacao(); return; }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installPrompt.style.display = 'none';
});

dismissInstall.addEventListener('click', () => {
    installPrompt.style.display = 'none';
    sessionStorage.setItem('installDismissed', 'true');
});

window.addEventListener('appinstalled', () => {
    installPrompt.style.display = 'none';
    mostrarMensagemSucesso('App instalado com sucesso!');
});

window.addEventListener('load', () => {
    if (!sessionStorage.getItem('installDismissed')) {
        setTimeout(() => {
            if (window.matchMedia('(display-mode: standalone)').matches) return;
            if (deferredPrompt) {
                installPrompt.style.display = 'block';
            } else {
                setTimeout(() => {
                    if (!sessionStorage.getItem('installDismissed')) mostrarInstrucoesInstalacao();
                }, 5000);
            }
        }, 3000);
    }
});

function mostrarInstrucoesInstalacao() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);

    let mensagem = '';
    if (isIOS) {
        mensagem = 'Para instalar no iOS:\n\n1. Toque no botão de compartilhar\n2. Role para baixo\n3. Toque em "Adicionar à Tela de Início"';
    } else if (isAndroid) {
        mensagem = 'Para instalar no Android:\n\n1. Toque nos 3 pontinhos\n2. Selecione "Instalar app"\n3. Confirme a instalação';
    } else {
        mensagem = 'Para instalar:\n\n1. Abra o menu do navegador\n2. Procure "Instalar"\n3. Confirme a instalação';
    }

    alert(mensagem);
}
