function gerarTextoRelatorio() {
    const data = new Date().toLocaleDateString('pt-BR');
    
    const relatorio = `RELATÓRIO DA CÉLULA ${document.getElementById('nomeCelula').value.toUpperCase()}

Data do Relatório: ${data}

DADOS GERAIS
Nome da Célula: ${document.getElementById('nomeCelula').value}
Local do Culto: ${document.getElementById('localCulto').value}
Horário do Culto: ${document.getElementById('cultoInicio').value} - ${document.getElementById('cultoFim').value}
Moderador do Culto: ${document.getElementById('moderador').value}

MOMENTO DE INTERCESSÃO
Intercessores: ${document.getElementById('intercessores').value}
Horário da Intercessão: ${document.getElementById('intercessaoInicio').value} - ${document.getElementById('intercessaoFim').value}

MOMENTO DA ORAÇÃO
Pontos de Oração:
${document.getElementById('pontosOracao').value}

MOMENTO DA PALAVRA
Pregador Evangelista: ${document.getElementById('pregadorEvangelista').value}
Pregador Principal: ${document.getElementById('pregadorPrincipal').value}
Tema da Pregação: ${document.getElementById('temaPregacao').value}
Notas da Pregação:
${document.getElementById('notasPregacao').value}

ESTATÍSTICA
Lista de Presenças:
${document.getElementById('listaPresencas').value}

Resumo:
- 1ª vez: ${document.getElementById('primeiraVez').value} pessoa(s)
- Receberam Jesus: ${document.getElementById('receberamJesus').value} pessoa(s)
- Batizados: ${document.getElementById('batizados').value} pessoa(s)
- Total de Participantes: ${document.getElementById('participantes').value} pessoa(s)
`;
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
        const msg = document.getElementById('successMessage');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 2000);
    });
}