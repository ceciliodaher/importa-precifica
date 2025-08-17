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

    // Se formato não especificado, mostrar opções
    if (!format) {
        showExportOptions();
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
 * Mostra opções de exportação para o usuário
 */
function showExportOptions() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'exportOptionsModal';
    modal.setAttribute('tabindex', '-1');
    
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-download"></i> Escolha o Formato de Exportação
                    </h5>
                    <button type="button" class="close" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="list-group">
                        <button type="button" class="list-group-item list-group-item-action" onclick="exportData('excel'); $('#exportOptionsModal').modal('hide');">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1"><i class="fas fa-file-excel text-success"></i> Planilha Excel (.xlsx)</h6>
                                <small class="text-success">Recomendado</small>
                            </div>
                            <p class="mb-1">Formato amigável com múltiplas abas: resumo, adições e produtos</p>
                            <small>Ideal para usuários finais e análise de dados</small>
                        </button>
                        <button type="button" class="list-group-item list-group-item-action" onclick="exportData('json'); $('#exportOptionsModal').modal('hide');">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1"><i class="fas fa-code text-info"></i> Arquivo JSON (.json)</h6>
                                <small class="text-info">Técnico</small>
                            </div>
                            <p class="mb-1">Dados estruturados completos em formato JSON</p>
                            <small>Para desenvolvedores e integração com sistemas</small>
                        </button>
                        <button type="button" class="list-group-item list-group-item-action" onclick="exportData('pdf'); $('#exportOptionsModal').modal('hide');">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1"><i class="fas fa-file-pdf text-danger"></i> Relatório PDF (.pdf)</h6>
                                <small class="text-muted">Em breve</small>
                            </div>
                            <p class="mb-1">Relatório formatado para impressão</p>
                            <small>Documentação e arquivamento</small>
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    $('#exportOptionsModal').modal('show');
    
    // Remover modal quando fechado
    $('#exportOptionsModal').on('hidden.bs.modal', function() {
        modal.remove();
    });
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
 * Exporta dados como Excel em formato amigável
 */
function exportAsExcel() {
    if (!window.app || !window.app.currentDI) {
        alert('Nenhuma DI processada para exportar.');
        return;
    }

    try {
        // Criar workbook
        const wb = XLSX.utils.book_new();
        
        // Aba 1: Resumo da DI
        const resumoData = [
            ['DECLARAÇÃO DE IMPORTAÇÃO - RESUMO'],
            [''],
            ['Número da DI:', window.app.currentDI.numero_di],
            ['Data de Registro:', window.app.currentDI.data_registro],
            ['URF de Despacho:', window.app.currentDI.urf_despacho_nome],
            ['Importador:', window.app.currentDI.importador.nome],
            ['CNPJ:', window.app.currentDI.importador.cnpj],
            ['Total de Adições:', window.app.currentDI.total_adicoes],
            ['Incoterm Identificado:', window.app.currentDI.incoterm_identificado?.codigo || 'N/I'],
            [''],
            ['TOTAIS GERAIS'],
            ['Valor FOB Total (R$):', window.app.currentDI.totais?.valor_total_fob_brl || 0],
            ['II Total (R$):', window.app.currentDI.totais?.tributos_totais?.ii_total || 0],
            ['IPI Total (R$):', window.app.currentDI.totais?.tributos_totais?.ipi_total || 0],
            ['PIS Total (R$):', window.app.currentDI.totais?.tributos_totais?.pis_total || 0],
            ['COFINS Total (R$):', window.app.currentDI.totais?.tributos_totais?.cofins_total || 0]
        ];
        
        const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo da DI');
        
        // Aba 2: Adições
        const adicoesHeaders = [
            'Número Adição', 'NCM', 'Descrição NCM', 'Quantidade', 'Unidade',
            'Valor FOB (USD)', 'Valor FOB (R$)', 'Frete (R$)', 'Seguro (R$)',
            'Incoterm', 'II Valor', 'IPI Valor', 'PIS Valor', 'COFINS Valor',
            'Total Tributos', 'Aplicação', 'Condição'
        ];
        
        const adicoesData = [adicoesHeaders];
        
        window.app.currentDI.adicoes.forEach(adicao => {
            const totalTributos = (adicao.tributos?.ii_valor_devido || 0) +
                                 (adicao.tributos?.ipi_valor_devido || 0) +
                                 (adicao.tributos?.pis_valor_devido || 0) +
                                 (adicao.tributos?.cofins_valor_devido || 0);
            
            adicoesData.push([
                adicao.numero_adicao,
                adicao.ncm,
                adicao.descricao_ncm,
                adicao.quantidade_estatistica,
                adicao.unidade_estatistica,
                adicao.valor_moeda_negociacao,
                adicao.valor_reais,
                adicao.frete_valor_reais || 0,
                adicao.seguro_valor_reais || 0,
                adicao.condicao_venda_incoterm,
                adicao.tributos?.ii_valor_devido || 0,
                adicao.tributos?.ipi_valor_devido || 0,
                adicao.tributos?.pis_valor_devido || 0,
                adicao.tributos?.cofins_valor_devido || 0,
                totalTributos,
                adicao.aplicacao_mercadoria || 'N/I',
                adicao.condicao_mercadoria || 'N/I'
            ]);
        });
        
        const wsAdicoes = XLSX.utils.aoa_to_sheet(adicoesData);
        XLSX.utils.book_append_sheet(wb, wsAdicoes, 'Adições');
        
        // Aba 3: Produtos/Itens (se houver)
        let produtosData = [
            ['Adição', 'Item', 'Descrição do Produto', 'Quantidade', 'Unidade', 
             'Valor Total', 'Valor Unitário', 'Fabricante', 'País Fabricante']
        ];
        
        let temProdutos = false;
        window.app.currentDI.adicoes.forEach(adicao => {
            if (adicao.produtos && adicao.produtos.length > 0) {
                temProdutos = true;
                adicao.produtos.forEach(produto => {
                    produtosData.push([
                        adicao.numero_adicao,
                        produto.numero_sequencial_item || '',
                        produto.descricao_mercadoria || '',
                        produto.quantidade || 0,
                        produto.unidade_medida || '',
                        produto.valor_total_item || 0,
                        produto.valor_unitario || 0,
                        produto.fabricante_nome || 'N/I',
                        produto.fabricante_pais || 'N/I'
                    ]);
                });
            }
        });
        
        if (temProdutos) {
            const wsProdutos = XLSX.utils.aoa_to_sheet(produtosData);
            XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos');
        }
        
        // Exportar arquivo
        const fileName = `DI_${window.app.currentDI.numero_di}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        window.app.showSuccess('Planilha Excel exportada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        window.app.showError('Erro ao gerar planilha Excel: ' + error.message);
    }
}

/**
 * Exporta dados como PDF (implementação futura)
 */
function exportAsPDF() {
    window.app.showInfo('Exportação para PDF será implementada em versão futura.');
}