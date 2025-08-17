/**
 * Funções Globais do Sistema Expertzy
 * Conecta a interface HTML com os módulos da aplicação
 */

/**
 * Processa arquivo XML selecionado
 * Conecta com o botão "Processar Arquivo" da interface
 */
function processFile() {
    if (window.app) {
        const fileInput = document.getElementById('xmlFile');
        if (fileInput && fileInput.files.length > 0) {
            window.app.processFile(fileInput.files[0]);
        } else {
            alert('Selecione um arquivo XML primeiro.');
        }
    } else {
        console.error('Sistema não inicializado');
    }
}

/**
 * Carrega arquivo de exemplo
 * Conecta com os botões "Carregar Exemplo" da interface
 */
function loadSample() {
    if (!window.app) {
        console.error('Sistema não inicializado');
        return;
    }

    // Mostrar loading
    window.app.showLoading('Carregando arquivo de exemplo...');

    fetch('samples/2300120746.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlContent => {
            // Processar XML usando o parser
            window.app.currentDI = window.app.xmlParser.parseXML(xmlContent);
            
            // Salvar e atualizar interface
            window.app.storage.saveDI(window.app.currentDI);
            window.app.updateDIInfo(window.app.currentDI);
            window.app.populateDataTab(window.app.currentDI);
            
            // Habilitar próximas etapas
            window.app.enableTab('dados');
            window.app.enableTab('custos');
            window.app.showCustosInterface();
            
            // Feedback e navegação
            window.app.hideLoading();
            window.app.showSuccess('Arquivo de exemplo carregado com sucesso!');
            window.app.switchTab('dados');
        })
        .catch(error => {
            window.app.hideLoading();
            console.error('Erro ao carregar exemplo:', error);
            window.app.showError('Erro ao carregar arquivo de exemplo: ' + error.message);
        });
}

/**
 * Exporta dados em formato especificado
 * Conecta com os botões de exportação da interface
 */
function exportData(format) {
    if (!window.app) {
        console.error('Sistema não inicializado');
        return;
    }

    if (!window.app.currentDI) {
        alert('Nenhuma DI processada para exportar.');
        return;
    }

    console.log(`Exportando dados em formato: ${format}`);
    
    switch(format) {
        case 'json':
            exportAsJSON();
            break;
        case 'excel':
            exportAsExcel();
            break;
        case 'pdf':
            exportAsPDF();
            break;
        default:
            console.warn(`Formato de exportação não suportado: ${format}`);
    }
}

/**
 * Exporta dados como JSON
 */
function exportAsJSON() {
    const data = {
        di: window.app.currentDI,
        results: window.app.currentResults,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `di_${window.app.currentDI.numero_di}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.app.showSuccess('Dados exportados em JSON com sucesso!');
}

/**
 * Exporta dados como Excel (implementação futura)
 */
function exportAsExcel() {
    window.app.showInfo('Exportação para Excel será implementada em versão futura.');
}

/**
 * Exporta dados como PDF (implementação futura)
 */
function exportAsPDF() {
    window.app.showInfo('Exportação para PDF será implementada em versão futura.');
}