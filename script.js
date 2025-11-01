// Sistema de armazenamento local
const STORAGE_KEY = 'relatorios_celula';

// Navegação entre páginas
function mostrarPagina(pagina) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Mostrar página selecionada
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
    }
}

// Carregar relatórios salvos
function carregarRelatorios() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

// Salvar relatórios
function salvarRelatorios(relatorios) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relatorios));
}

// Obter dados do formulário
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

// Preencher formulário com dados
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

// Salvar relatório atual
function salvarRelatorioAtual() {
    const dados = obterDadosFormulario();
    
    if (!dados.nomeCelula.trim()) {
        alert('Por favor, preencha o nome da célula antes de salvar.');
        return;
    }
    
    const dataAtual = new Date();
    
    const relatorio = {
        id: Date.now(),
        data: dataAtual.toISOString(),
        dataFormatada: dataAtual.toLocaleDateString('pt-BR'),
        mes: dataAtual.getMonth() + 1,
        ano: dataAtual.getFullYear(),
        dados: dados
    };
    
    const relatorios = carregarRelatorios();
    relatorios.push(relatorio);
    salvarRelatorios(relatorios);
    
    mostrarMensagemSucesso('Relatório salvo com sucesso!');
    return relatorio;
}

function gerarTextoRelatorio() {
    const data = new Date().toLocaleDateString('pt-BR');
    
    // Processar intercessores (COM numeração)
    const intercessoresRaw = document.getElementById('intercessores').value;
    const intercessoresArray = intercessoresRaw.split('\n').filter(line => line.trim() !== '');
    const intercessoresFormatados = intercessoresArray.map((nome, index) => `${index + 1}.${nome.trim()}`).join('\n');
    
    // Processar lista de presenças (SEM numeração)
    const presencasRaw = document.getElementById('listaPresencas').value;
    const presencasArray = presencasRaw.split('\n').filter(line => line.trim() !== '');
    const presencasFormatadas = presencasArray.map(nome => nome.trim()).join('\n');
    
    // Processar pontos de oração
    const pontosRaw = document.getElementById('pontosOracao').value;
    const pontosArray = pontosRaw.split('\n').filter(line => line.trim() !== '');
    const pontosFormatados = pontosArray.map(ponto => ponto.trim()).join('\n');
    
    const relatorio = `Relatório, ACQS Célula ${document.getElementById('nomeCelula').value}
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
    
    return relatorio;
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
    const texto = document.getElementById('relatorioTexto').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        mostrarMensagemSucesso('Texto copiado!');
    });
}

function mostrarMensagemSucesso(mensagem) {
    const msg = document.getElementById('successMessage');
    msg.textContent = mensagem;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
}

// Exportar relatórios para JSON
function exportarRelatorios() {
    const relatorios = carregarRelatorios();
    if (relatorios.length === 0) {
        alert('Não há relatórios para exportar.');
        return;
    }
    
    const dataExportacao = new Date().toISOString().split('T')[0];
    const dados = {
        versao: '1.0',
        dataExportacao: dataExportacao,
        totalRelatorios: relatorios.length,
        relatorios: relatorios
    };
    
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorios_backup_${dataExportacao}.json`;
    link.click();
    
    mostrarMensagemSucesso('Relatórios exportados!');
}

// Importar relatórios de JSON
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
            
            let novosAdicionados = 0;
            dados.relatorios.forEach(relatorio => {
                if (!idsExistentes.has(relatorio.id)) {
                    relatoriosExistentes.push(relatorio);
                    novosAdicionados++;
                }
            });
            
            salvarRelatorios(relatoriosExistentes);
            mostrarMensagemSucesso(`${novosAdicionados} relatório(s) importado(s)!`);
        } catch (erro) {
            alert('Erro ao importar: ' + erro.message);
        }
    };
    reader.readAsText(arquivo);
    event.target.value = '';
}

// Carregar histórico
function carregarHistorico() {
    const relatorios = carregarRelatorios();
    
    if (relatorios.length === 0) {
        document.getElementById('historicoConteudo').innerHTML = '<p style="text-align: center; padding: 40px;">Nenhum relatório salvo ainda.</p>';
        return;
    }
    
    // Organizar por ano e mês
    const porAnoMes = {};
    relatorios.forEach(relatorio => {
        const chave = `${relatorio.ano}-${String(relatorio.mes).padStart(2, '0')}`;
        if (!porAnoMes[chave]) {
            porAnoMes[chave] = [];
        }
        porAnoMes[chave].push(relatorio);
    });
    
    const chavesOrdenadas = Object.keys(porAnoMes).sort().reverse();
    
    let html = '';
    
    chavesOrdenadas.forEach(chave => {
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
        
        html += `
                </div>
            </div>
        `;
    });
    
    document.getElementById('historicoConteudo').innerHTML = html;
}

function obterNomeMes(numeroMes) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[numeroMes - 1];
}

function visualizarRelatorio(id) {
    const relatorios = carregarRelatorios();
    const relatorio = relatorios.find(r => r.id === id);
    
    if (!relatorio) {
        alert('Relatório não encontrado.');
        return;
    }
    
    const dadosAntigos = obterDadosFormulario();
    preencherFormulario(relatorio.dados);
    const textoRelatorio = gerarTextoRelatorio();
    preencherFormulario(dadosAntigos);
    
    document.getElementById('relatorioTexto').textContent = textoRelatorio;
    document.getElementById('modal').style.display = 'block';
}

function carregarRelatorio(id) {
    const relatorios = carregarRelatorios();
    const relatorio = relatorios.find(r => r.id === id);
    
    if (!relatorio) {
        alert('Relatório não encontrado.');
        return;
    }
    
    preencherFormulario(relatorio.dados);
    mostrarPagina('form');
    mostrarMensagemSucesso('Relatório carregado para edição!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirRelatorio(id) {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) {
        return;
    }
    
    const relatorios = carregarRelatorios();
    const novaLista = relatorios.filter(r => r.id !== id);
    salvarRelatorios(novaLista);
    
    mostrarMensagemSucesso('Relatório excluído!');
    carregarHistorico();
}

function limparFormulario() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('relatorioForm').reset();
        mostrarMensagemSucesso('Formulário limpo!');
    }
}

// Carregar estatísticas
function carregarEstatisticas() {
    const relatorios = carregarRelatorios();
    
    if (relatorios.length === 0) {
        document.getElementById('statsConteudo').innerHTML = '<p style="text-align: center; padding: 40px;">Nenhum dado disponível ainda.</p>';
        return;
    }
    
    // Calcular estatísticas
    let totalCultos = relatorios.length;
    let totalPrimeiraVez = 0;
    let totalReceberamJesus = 0;
    let totalBatizados = 0;
    let totalParticipantes = 0;
    
    relatorios.forEach(r => {
        totalPrimeiraVez += r.dados.primeiraVez || 0;
        totalReceberamJesus += r.dados.receberamJesus || 0;
        totalBatizados += r.dados.batizados || 0;
        totalParticipantes += r.dados.participantes || 0;
    });
    
    const mediaParticipantes = (totalParticipantes / totalCultos).toFixed(1);
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <i class="fas fa-calendar-check"></i>
                <div class="number">${totalCultos}</div>
                <div class="label">Total de Cultos</div>
            </div>
            
            <div class="stat-card">
                <i class="fas fa-user-plus"></i>
                <div class="number">${totalPrimeiraVez}</div>
                <div class="label">Pessoas 1ª Vez</div>
            </div>
            
            <div class="stat-card">
                <i class="fas fa-heart"></i>
                <div class="number">${totalReceberamJesus}</div>
                <div class="label">Receberam Jesus</div>
            </div>
            
            <div class="stat-card">
                <i class="fas fa-water"></i>
                <div class="number">${totalBatizados}</div>
                <div class="label">Batizados</div>
            </div>
            
            <div class="stat-card">
                <i class="fas fa-users"></i>
                <div class="number">${totalParticipantes}</div>
                <div class="label">Total Participantes</div>
            </div>
            
            <div class="stat-card">
                <i class="fas fa-chart-line"></i>
                <div class="number">${mediaParticipantes}</div>
                <div class="label">Média por Culto</div>
            </div>
        </div>
        
        <h2 style="margin-top: 30px;">Estatísticas por Mês</h2>
        <div id="statsMensais"></div>
    `;
    
    document.getElementById('statsConteudo').innerHTML = html;
    
    // Estatísticas mensais
    const porMes = {};
    relatorios.forEach(r => {
        const chave = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
        if (!porMes[chave]) {
            porMes[chave] = {
                cultos: 0,
                primeiraVez: 0,
                receberamJesus: 0,
                batizados: 0,
                participantes: 0
            };
        }
        porMes[chave].cultos++;
        porMes[chave].primeiraVez += r.dados.primeiraVez || 0;
        porMes[chave].receberamJesus += r.dados.receberamJesus || 0;
        porMes[chave].batizados += r.dados.batizados || 0;
        porMes[chave].participantes += r.dados.participantes || 0;
    });
    
    let htmlMensais = '';
    Object.keys(porMes).sort().reverse().forEach(chave => {
        const [ano, mes] = chave.split('-');
        const nomeMes = obterNomeMes(parseInt(mes));
        const dados = porMes[chave];
        
        htmlMensais += `
            <div class="mes-grupo">
                <h3>${nomeMes} ${ano}</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="number">${dados.cultos}</div>
                        <div class="label">Cultos</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${dados.primeiraVez}</div>
                        <div class="label">1ª Vez</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${dados.receberamJesus}</div>
                        <div class="label">Receberam Jesus</div>
                    </div>
                    <div class="stat-card">
                        <div class="number">${dados.batizados}</div>
                        <div class="label">Batizados</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('statsMensais').innerHTML = htmlMensais;
}

// Registrar Service Worker para funcionamento offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}

// PWA Install Prompt
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installButton = document.getElementById('installButton');
const dismissInstall = document.getElementById('dismissInstall');

// Detectar quando o navegador está pronto para instalar
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir o prompt automático
    e.preventDefault();
    // Guardar o evento para usar depois
    deferredPrompt = e;
    // Mostrar nosso botão customizado
    installPrompt.style.display = 'block';
    console.log('PWA pode ser instalado!');
});

// Quando clicar no botão de instalar
installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
        // Se não tiver o prompt, mostrar instruções manuais
        mostrarInstrucoesInstalacao();
        return;
    }
    
    // Mostrar o prompt de instalação
    deferredPrompt.prompt();
    
    // Esperar pela escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} instalar`);
    
    // Limpar o prompt
    deferredPrompt = null;
    installPrompt.style.display = 'none';
});

// Quando clicar em dispensar
dismissInstall.addEventListener('click', () => {
    installPrompt.style.display = 'none';
    // Salvar que o usuário dispensou (não mostrar novamente nesta sessão)
    sessionStorage.setItem('installDismissed', 'true');
});

// Detectar quando o app foi instalado
window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso!');
    installPrompt.style.display = 'none';
    mostrarMensagemSucesso('App instalado com sucesso!');
});

// Mostrar prompt se não foi dispensado
window.addEventListener('load', () => {
    if (!sessionStorage.getItem('installDismissed')) {
        // Esperar 3 segundos antes de mostrar
        setTimeout(() => {
            // Verificar se já está instalado
            if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('App já está instalado');
                return;
            }
            // Se tiver o deferredPrompt, mostrar
            if (deferredPrompt) {
                installPrompt.style.display = 'block';
            } else {
                // Se não tiver, pode ser iOS ou navegador que não suporta
                // Mostrar instruções após 5 segundos
                setTimeout(() => {
                    if (!sessionStorage.getItem('installDismissed')) {
                        mostrarInstrucoesInstalacao();
                    }
                }, 5000);
            }
        }, 3000);
    }
});

// Função para mostrar instruções manuais
function mostrarInstrucoesInstalacao() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let mensagem = '';
    
    if (isIOS) {
        mensagem = ` Para instalar no iOS:\n\n1. Toque no botão de compartilhar (□↑)\n2. Role para baixo\n3. Toque em "Adicionar à Tela de Início"\n4. Toque em "Adicionar"`;
    } else if (isAndroid) {
        mensagem = ` Para instalar no Android:\n\n1. Toque nos 3 pontinhos (⋮) no canto\n2. Selecione "Instalar app" ou "Adicionar à tela inicial"\n3. Confirme a instalação`;
    } else {
        mensagem = ` Para instalar:\n\n1. Abra o menu do navegador\n2. Procure "Instalar" ou "Adicionar à tela inicial"\n3. Confirme a instalação`;
    }
    
    alert(mensagem);
}