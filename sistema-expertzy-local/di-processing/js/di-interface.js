/**
 * di-interface.js - Interface Controller for DI Processing
 * 
 * Handles UI interactions for the DI Compliance Processor
 * Coordinates between DIProcessor and ComplianceCalculator
 * Manages workflow steps and user experience
 */

// Global instances
let diProcessor = null;
let complianceCalculator = null;
let currentDI = null;
let currentStep = 1;
let expenseCounter = 0;
let currencyMasks = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DI Interface: Inicializando sistema...');
    initializeSystem();
    setupEventListeners();
});

/**
 * Initialize system components
 */
async function initializeSystem() {
    try {
        // Initialize processor instances
        diProcessor = new DIProcessor();
        complianceCalculator = new ComplianceCalculator();
        
        // Load tax configurations
        await complianceCalculator.carregarConfiguracoes();
        
        // Setup expense preview listeners
        setupExpensePreview();
        
        console.log('✅ Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showAlert('Erro ao inicializar sistema. Recarregue a página.', 'danger');
    }
}

/**
 * Setup event listeners for form inputs
 */
function setupEventListeners() {
    // File input change
    document.getElementById('xmlFile').addEventListener('change', handleFileSelection);
    
    // ===== DRAG & DROP FUNCIONAL (copiado do sistema legado) =====
    setupDragAndDrop();
    
    // Initialize currency masks for predefined expenses
    initializeCurrencyMasks();
    
    // Setup expense table event delegation
    setupExpenseTableEvents();
}

/**
 * Initialize currency masks for expense inputs
 */
function initializeCurrencyMasks() {
    // Apply masks to predefined expense inputs
    document.querySelectorAll('.expense-value').forEach(input => {
        applyCurrencyMask(input);
    });
}

/**
 * Apply currency mask to an input element
 */
function applyCurrencyMask(input) {
    const cleave = new Cleave(input, {
        numeral: true,
        numeralThousandsGroupStyle: 'thousand',
        numeralDecimalMark: ',',
        delimiter: '.',
        numeralDecimalScale: 2,
        numeralPositiveOnly: true,
        onValueChanged: function(e) {
            updateExpensePreview();
        }
    });
    currencyMasks.push(cleave);
    return cleave;
}

/**
 * Setup expense table event delegation
 */
function setupExpenseTableEvents() {
    const table = document.getElementById('expensesTableBody');
    
    if (table) {
        // Delegate events for dynamic rows
        table.addEventListener('change', function(e) {
            if (e.target.classList.contains('expense-icms')) {
                updateExpensePreview();
            }
        });
        
        table.addEventListener('click', function(e) {
            if (e.target.closest('.remove-expense')) {
                removeExpenseRow(e.target.closest('tr'));
            }
        });
    }
}

/**
 * Handle file selection
 */
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/xml') {
        console.log(`📁 Arquivo selecionado: ${file.name}`);
        showFileInfo(file);
    } else if (file) {
        showAlert('Por favor, selecione um arquivo XML válido.', 'warning');
        event.target.value = '';
        hideFileInfo();
    }
}

/**
 * Show file information
 */
function showFileInfo(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileType').textContent = file.type || 'text/xml';
    document.getElementById('fileInfo').classList.remove('d-none');
}

/**
 * Hide file information
 */
function hideFileInfo() {
    document.getElementById('fileInfo').classList.add('d-none');
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main function to process DI
 */
async function processarDI() {
    const fileInput = document.getElementById('xmlFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Por favor, selecione um arquivo XML.', 'warning');
        return;
    }
    
    try {
        showLoading('Processando DI...', 'Extraindo dados fiscais da declaração');
        
        // Read file content
        const xmlContent = await readFileContent(file);
        
        // Process DI usando o parser legado funcional
        currentDI = await diProcessor.parseXML(xmlContent);
        
        // Populate step 2 with DI data
        populateStep2Data(currentDI);
        
        // Show all additions (not just first one)
        populateAllAdditions(currentDI);
        
        // Move to step 2
        hideLoading();
        avancarStep(2);
        
        showAlert('DI processada com sucesso! Configure as despesas extras.', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro no processamento:', error);
        showAlert('Erro ao processar DI: ' + error.message, 'danger');
    }
}

/**
 * Read file content as text
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

/**
 * Populate step 2 with DI data
 */
function populateStep2Data(diData) {
    // Update DI summary (legacy style)
    updateDIInfo(diData);
    
    // Basic DI info
    document.getElementById('diNumber').textContent = diData.numero_di || 'N/A';
    document.getElementById('diDate').textContent = diData.data_registro || 'N/A';
    document.getElementById('diIncoterm').textContent = diData.incoterm_identificado?.codigo || 'N/A';
    
    // First addition data (most DIs have one main addition)
    const firstAddition = diData.adicoes?.[0];
    if (firstAddition) {
        document.getElementById('diCifValue').textContent = formatCurrency(firstAddition.valor_reais || 0);
        document.getElementById('productNCM').textContent = firstAddition.ncm || 'N/A';
        document.getElementById('productDesc').textContent = firstAddition.descricao_ncm || 'N/A';
        document.getElementById('productWeight').textContent = `${formatNumber(firstAddition.peso_liquido || 0)} kg`;
        document.getElementById('supplierName').textContent = firstAddition.fornecedor?.nome || 'N/A';
    }
    
    // Automatic expenses using legacy parser structure
    populateAutomaticExpenses(diData.despesas_aduaneiras);
    
    // Initialize expense preview
    updateExpensePreview();
}

/**
 * Populate all additions (copied from legacy system)
 */
function populateAllAdditions(diData) {
    const container = createAdditionsContainer();
    
    if (!diData.adicoes || diData.adicoes.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">Nenhuma adição encontrada na DI.</div>';
        return;
    }
    
    const tableHtml = `
        <div class="card mb-4">
            <div class="card-header">
                <h6><i class="bi bi-list"></i> Todas as Adições da DI (${diData.adicoes.length})</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Adição</th>
                                <th>NCM</th>
                                <th>Descrição</th>
                                <th>Peso (kg)</th>
                                <th>Valor (R$)</th>
                                <th>Incoterm</th>
                                <th>Fornecedor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${diData.adicoes.map(adicao => `
                                <tr>
                                    <td><strong>${adicao.numero_adicao}</strong></td>
                                    <td><code>${adicao.ncm}</code></td>
                                    <td class="text-truncate" style="max-width: 200px;" title="${adicao.descricao_ncm}">${adicao.descricao_ncm}</td>
                                    <td>${formatNumber(adicao.peso_liquido || 0)}</td>
                                    <td>${formatCurrency(adicao.valor_reais || 0)}</td>
                                    <td><span class="badge bg-info">${adicao.condicao_venda_incoterm || 'N/A'}</span></td>
                                    <td class="text-truncate" style="max-width: 150px;" title="${adicao.fornecedor?.nome}">${adicao.fornecedor?.nome || 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary" onclick="viewAdicaoDetails('${adicao.numero_adicao}')" title="Ver detalhes">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-3">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h5 class="card-title text-primary">${formatCurrency(diData.totais?.valor_total_fob_brl || 0)}</h5>
                                    <p class="card-text small">Valor Total FOB</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h5 class="card-title text-success">${formatNumber(diData.totais?.peso_liquido_total || 0)} kg</h5>
                                    <p class="card-text small">Peso Total</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h5 class="card-title text-info">${diData.adicoes.length}</h5>
                                    <p class="card-text small">Total de Adições</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = tableHtml;
}

/**
 * Create additions container if it doesn't exist
 */
function createAdditionsContainer() {
    let container = document.getElementById('allAdditionsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'allAdditionsContainer';
        container.className = 'all-additions mb-4';
        
        // Insert after the DI summary in step2
        const diSummary = document.getElementById('diSummary');
        if (diSummary && diSummary.parentNode) {
            diSummary.parentNode.insertBefore(container, diSummary.nextSibling);
        } else {
            const step2 = document.getElementById('step2');
            if (step2) {
                step2.appendChild(container);
            }
        }
    }
    return container;
}

/**
 * View addition details (copied from legacy system)
 */
function viewAdicaoDetails(numeroAdicao) {
    if (!currentDI || !currentDI.adicoes) {
        showAlert('Nenhuma DI carregada.', 'warning');
        return;
    }
    
    const adicao = currentDI.adicoes.find(add => add.numero_adicao === numeroAdicao);
    if (!adicao) {
        showAlert('Adição não encontrada.', 'warning');
        return;
    }
    
    // Create modal for addition details
    const modalContent = `
        <div class="modal fade" id="adicaoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-box"></i> Detalhes da Adição ${numeroAdicao}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>Classificação Fiscal</h6>
                                <p><strong>NCM:</strong> ${adicao.ncm}</p>
                                <p><strong>Descrição:</strong> ${adicao.descricao_ncm}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Valores Comerciais</h6>
                                <p><strong>Valor USD:</strong> ${formatCurrencyWithCode(adicao.valor_moeda_negociacao || 0, adicao.moeda_negociacao_codigo)}</p>
                                <p><strong>Valor BRL:</strong> ${formatCurrency(adicao.valor_reais || 0)}</p>
                                <p><strong>Peso Líquido:</strong> ${formatNumber(adicao.peso_liquido || 0)} kg</p>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>Fornecedor</h6>
                                <p><strong>Nome:</strong> ${adicao.fornecedor?.nome || 'N/A'}</p>
                                <p><strong>Endereço:</strong> ${adicao.fornecedor?.endereco_completo || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Tributos Federais</h6>
                                <p><strong>II:</strong> ${adicao.tributos?.ii_aliquota || 0}% - ${formatCurrency(adicao.tributos?.ii_valor_devido || 0)}</p>
                                <p><strong>IPI:</strong> ${adicao.tributos?.ipi_aliquota || 0}% - ${formatCurrency(adicao.tributos?.ipi_valor_devido || 0)}</p>
                                <p><strong>PIS:</strong> ${adicao.tributos?.pis_aliquota_ad_valorem || 0}% - ${formatCurrency(adicao.tributos?.pis_valor_devido || 0)}</p>
                                <p><strong>COFINS:</strong> ${adicao.tributos?.cofins_aliquota_ad_valorem || 0}% - ${formatCurrency(adicao.tributos?.cofins_valor_devido || 0)}</p>
                            </div>
                        </div>
                        
                        ${adicao.produtos ? `
                        <div class="mt-3">
                            <h6>Produtos desta Adição</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Descrição</th>
                                            <th>Quantidade</th>
                                            <th>Valor Unit.</th>
                                            <th>Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${adicao.produtos.map(produto => `
                                            <tr>
                                                <td>${produto.numero_sequencial_item || '-'}</td>
                                                <td>${produto.descricao_mercadoria || '-'}</td>
                                                <td>${formatNumber(produto.quantidade || 0)} ${produto.unidade_medida || ''}</td>
                                                <td>${formatUSD(produto.valor_unitario || 0)}</td>
                                                <td>${formatUSD(produto.valor_total_item || 0)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove modal if exists
    const existingModal = document.getElementById('adicaoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal (Bootstrap 5)
    const modal = new bootstrap.Modal(document.getElementById('adicaoModal'));
    modal.show();
}

/**
 * Populate automatic expenses display
 */
function populateAutomaticExpenses(despesasAuto) {
    const container = document.getElementById('automaticExpenses');
    container.innerHTML = '';
    
    if (!despesasAuto) return;
    
    const calculadas = despesasAuto.calculadas || {};
    const expenses = [
        { key: 'siscomex', label: 'SISCOMEX', icon: 'file-text', value: calculadas.siscomex || 0 },
        { key: 'afrmm', label: 'AFRMM', icon: 'ship', value: calculadas.afrmm || 0 },
        { key: 'capatazia', label: 'Capatazia/Armazenagem', icon: 'box', value: calculadas.capatazia || 0 }
    ];
    
    expenses.forEach(expense => {
        if (expense.value > 0) {
            const expenseCard = document.createElement('div');
            expenseCard.className = 'col-md-4 mb-3';
            expenseCard.innerHTML = `
                <div class="expense-card auto-expense">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${expense.icon} me-2 text-success"></i>
                        <div>
                            <strong>${expense.label}</strong><br>
                            <span class="text-success">${formatCurrency(expense.value)}</span>
                            <br><small class="text-muted">Incluso na base ICMS</small>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(expenseCard);
        }
    });
    
    // Total automatic expenses
    const totalCard = document.createElement('div');
    totalCard.className = 'col-12';
    totalCard.innerHTML = `
        <div class="alert alert-info">
            <strong><i class="bi bi-calculator"></i> Total Despesas Automáticas: ${formatCurrency(despesasAuto.total || 0)}</strong>
            <br><small>Estas despesas são obrigatórias e sempre compõem a base de cálculo do ICMS</small>
        </div>
    `;
    container.appendChild(totalCard);
}

/**
 * Setup expense preview functionality
 */
function setupExpensePreview() {
    // This will be called after initialization
}

/**
 * Add new expense row to the table
 */
function addExpenseRow() {
    expenseCounter++;
    const tbody = document.getElementById('expensesTableBody');
    const newRow = document.createElement('tr');
    newRow.dataset.expenseId = `custom_${expenseCounter}`;
    newRow.dataset.predefined = 'false';
    
    newRow.innerHTML = `
        <td><i class="bi bi-currency-dollar text-warning"></i></td>
        <td>
            <input type="text" class="form-control form-control-sm expense-name" 
                   placeholder="Nome da despesa" value="">
        </td>
        <td>
            <div class="input-group input-group-sm">
                <span class="input-group-text">R$</span>
                <input type="text" class="form-control expense-value" 
                       data-expense="custom_${expenseCounter}" placeholder="0,00">
            </div>
        </td>
        <td class="text-center">
            <div class="form-check d-flex justify-content-center">
                <input class="form-check-input expense-icms" type="checkbox" 
                       data-expense="custom_${expenseCounter}">
            </div>
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-danger remove-expense" 
                    title="Remover despesa">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    
    // Apply currency mask to the new input
    const valueInput = newRow.querySelector('.expense-value');
    applyCurrencyMask(valueInput);
    
    // Focus on the name input
    newRow.querySelector('.expense-name').focus();
}

/**
 * Remove expense row from the table
 */
function removeExpenseRow(row) {
    if (row && row.dataset.predefined === 'false') {
        row.remove();
        updateExpensePreview();
    }
}

/**
 * Get all expenses from the table
 */
function getAllExpenses() {
    const expenses = [];
    
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
        const valueInput = row.querySelector('.expense-value');
        const icmsInput = row.querySelector('.expense-icms');
        const nameInput = row.querySelector('.expense-name') || row.querySelector('input[readonly]');
        
        if (valueInput) {
            const value = parseFloat(valueInput.value.replace(/\./g, '').replace(',', '.')) || 0;
            
            if (value > 0) {
                expenses.push({
                    id: row.dataset.expenseId,
                    name: nameInput ? nameInput.value : 'Despesa',
                    value: value,
                    includeInICMS: icmsInput ? icmsInput.checked : false,
                    isPredefined: row.dataset.predefined === 'true'
                });
            }
        }
    });
    
    return expenses;
}

/**
 * Update expense preview in real time
 */
function updateExpensePreview() {
    if (!currentDI) return;
    
    // Get all expenses from the table
    const expenses = getAllExpenses();
    
    // Calculate totals
    const totalExtra = expenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalExtraICMS = expenses
        .filter(exp => exp.includeInICMS)
        .reduce((sum, exp) => sum + exp.value, 0);
    
    // Calculate ICMS impact using parser legado structure
    if (!currentDI.despesas_aduaneiras || !currentDI.despesas_aduaneiras.total_despesas_aduaneiras) {
        console.error('❌ Despesas aduaneiras não encontradas na DI');
        return;
    }
    const automaticExpenses = currentDI.despesas_aduaneiras.total_despesas_aduaneiras;
    const baseICMSBefore = automaticExpenses;
    const baseICMSAfter = automaticExpenses + totalExtraICMS;
    const icmsDifference = (baseICMSAfter - baseICMSBefore) * 0.19 / 0.81; // ICMS GO = 19%
    
    // Update preview
    document.getElementById('previewTotalExtra').textContent = formatCurrency(totalExtra);
    const icmsExpensesEl = document.getElementById('previewICMSExpenses');
    if (icmsExpensesEl) {
        icmsExpensesEl.textContent = formatCurrency(totalExtraICMS);
    }
    document.getElementById('previewICMSBefore').textContent = formatCurrency(baseICMSBefore);
    document.getElementById('previewICMSAfter').textContent = formatCurrency(baseICMSAfter);
    document.getElementById('previewICMSDiff').textContent = formatCurrency(icmsDifference);
    
    // Update total in table footer
    const totalEl = document.getElementById('totalExtraExpenses');
    if (totalEl) {
        totalEl.textContent = formatCurrency(totalExtra);
    }
}

/**
 * Calculate taxes based on current configuration
 */
async function calcularImpostos() {
    if (!currentDI) {
        showAlert('Nenhuma DI carregada.', 'warning');
        return;
    }
    
    try {
        showLoading('Calculando impostos...', 'Aplicando legislação fiscal brasileira');
        
        // Get all expenses from the table
        const expenses = getAllExpenses();
        
        // Build extra expenses object for legacy compatibility
        const extraExpenses = {
            armazenagem: 0,
            transporte_interno: 0,
            despachante: 0,
            armazenagem_icms: false,
            transporte_interno_icms: false,
            despachante_icms: false,
            outras_despesas: []
        };
        
        // Process expenses
        expenses.forEach(exp => {
            if (exp.id === 'storage') {
                extraExpenses.armazenagem = exp.value;
                extraExpenses.armazenagem_icms = exp.includeInICMS;
            } else if (exp.id === 'transport') {
                extraExpenses.transporte_interno = exp.value;
                extraExpenses.transporte_interno_icms = exp.includeInICMS;
            } else if (exp.id === 'agent') {
                extraExpenses.despachante = exp.value;
                extraExpenses.despachante_icms = exp.includeInICMS;
            } else {
                // Custom expenses
                extraExpenses.outras_despesas.push({
                    descricao: exp.name,
                    valor: exp.value,
                    base_icms: exp.includeInICMS
                });
            }
        });
        
        // Get consolidated expenses using legacy method
        const despesasConsolidadas = diProcessor.consolidarDespesasCompletas(extraExpenses);
        
        // Add custom expenses to consolidated total if needed
        if (extraExpenses.outras_despesas.length > 0) {
            const totalOutras = extraExpenses.outras_despesas.reduce((sum, d) => sum + d.valor, 0);
            const totalOutrasICMS = extraExpenses.outras_despesas
                .filter(d => d.base_icms)
                .reduce((sum, d) => sum + d.valor, 0);
            
            despesasConsolidadas.total += totalOutras;
            despesasConsolidadas.total_base_icms += totalOutrasICMS;
        }
        
        // Calculate taxes for first addition (main product)
        const firstAddition = currentDI.adicoes[0];
        const taxCalculation = complianceCalculator.calcularImpostosImportacao(firstAddition, despesasConsolidadas);
        
        // Store calculation results
        currentDI.calculoImpostos = taxCalculation;
        currentDI.despesasExtras = expenses; // Store for export
        
        // Populate step 3 with results
        populateStep3Results(taxCalculation);
        
        // Move to step 3
        hideLoading();
        avancarStep(3);
        
        showAlert('Impostos calculados com sucesso!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro no cálculo:', error);
        showAlert('Erro ao calcular impostos: ' + error.message, 'danger');
    }
}

/**
 * Populate step 3 with tax calculation results
 */
function populateStep3Results(calculation) {
    // Tax summary cards
    const resultsContainer = document.getElementById('taxResults');
    resultsContainer.innerHTML = `
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <h6 class="card-title">II</h6>
                    <h4 class="text-primary">${formatCurrency(calculation.impostos.ii.valor_devido)}</h4>
                    <small class="text-muted">${calculation.impostos.ii.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <h6 class="card-title">IPI</h6>
                    <h4 class="text-primary">${formatCurrency(calculation.impostos.ipi.valor_devido)}</h4>
                    <small class="text-muted">${calculation.impostos.ipi.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <h6 class="card-title">PIS/COFINS</h6>
                    <h4 class="text-primary">${formatCurrency(calculation.impostos.pis.valor_devido + calculation.impostos.cofins.valor_devido)}</h4>
                    <small class="text-muted">11.75%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center border-primary">
                <div class="card-body">
                    <h6 class="card-title">ICMS</h6>
                    <h4 class="text-primary">${formatCurrency(calculation.impostos.icms.valor_devido)}</h4>
                    <small class="text-muted">${calculation.impostos.icms.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="alert alert-primary text-center">
                <h4><strong>Total Impostos: ${formatCurrency(calculation.totais.total_impostos)}</strong></h4>
                <p class="mb-0">Custo Total da Importação: <strong>${formatCurrency(calculation.totais.custo_total)}</strong></p>
            </div>
        </div>
    `;
    
    // Detailed breakdown
    const detailsContainer = document.getElementById('taxDetails');
    detailsContainer.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="bi bi-receipt"></i> Base de Cálculo ICMS</h6>
                <table class="table table-sm">
                    <tr>
                        <td>CIF (R$)</td>
                        <td class="text-end">${formatCurrency(calculation.valores_base.cif_brl)}</td>
                    </tr>
                    <tr>
                        <td>II</td>
                        <td class="text-end">${formatCurrency(calculation.impostos.ii.valor_devido)}</td>
                    </tr>
                    <tr>
                        <td>IPI</td>
                        <td class="text-end">${formatCurrency(calculation.impostos.ipi.valor_devido)}</td>
                    </tr>
                    <tr>
                        <td>PIS</td>
                        <td class="text-end">${formatCurrency(calculation.impostos.pis.valor_devido)}</td>
                    </tr>
                    <tr>
                        <td>COFINS</td>
                        <td class="text-end">${formatCurrency(calculation.impostos.cofins.valor_devido)}</td>
                    </tr>
                    <tr class="table-primary">
                        <td><strong>Despesas Aduaneiras</strong></td>
                        <td class="text-end"><strong>${formatCurrency(calculation.despesas.total_base_icms)}</strong></td>
                    </tr>
                    <tr class="table-info">
                        <td><strong>Base ICMS Final</strong></td>
                        <td class="text-end"><strong>${formatCurrency(calculation.impostos.icms.base_calculo_final)}</strong></td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6><i class="bi bi-info-circle"></i> Informações Adicionais</h6>
                <ul class="list-unstyled">
                    <li><strong>Estado:</strong> ${calculation.estado}</li>
                    <li><strong>NCM:</strong> ${calculation.ncm}</li>
                    <li><strong>Peso:</strong> ${calculation.valores_base.peso_liquido.toFixed(2)} kg</li>
                    <li><strong>Taxa Câmbio:</strong> ${calculation.valores_base.taxa_cambio.toFixed(4)}</li>
                    <li><strong>Custo por kg:</strong> ${formatCurrency(calculation.totais.custo_por_kg)}</li>
                </ul>
                
                ${calculation.despesas.extras_tributaveis > 0 ? `
                    <div class="alert alert-info small">
                        <i class="bi bi-exclamation-circle"></i>
                        <strong>Despesas Extras Incluídas:</strong><br>
                        ${formatCurrency(calculation.despesas.extras_tributaveis)} adicionados à base ICMS
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Navigation functions
 */
function avancarStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).classList.add('hidden');
    }
    
    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    targetStep.classList.remove('hidden');
    
    // Update step indicator
    updateStepIndicator(stepNumber);
    
    currentStep = stepNumber;
    
    // Smooth scroll to step instead of forcing to top
    targetStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function voltarStep(stepNumber) {
    avancarStep(stepNumber);
}

function updateStepIndicator(activeStep) {
    const indicators = document.querySelectorAll('.process-indicator .badge');
    
    indicators.forEach((badge, index) => {
        const stepNum = index + 1;
        
        if (stepNum < activeStep) {
            badge.className = 'badge bg-success me-2';
        } else if (stepNum === activeStep) {
            badge.className = 'badge bg-primary me-2';
        } else {
            badge.className = 'badge bg-secondary me-2';
        }
    });
}

/**
 * Export functions
 */
function exportarPlanilhaCustos() {
    if (!currentDI) {
        showAlert('Nenhuma DI carregada para exportar.', 'warning');
        return;
    }
    
    try {
        // Call the global export function from the legacy system
        if (typeof exportData === 'function') {
            exportData('excel');
            showAlert('Planilha de custos exportada com sucesso!', 'success');
        } else {
            // Fallback: Export as JSON
            exportAsJSON('custos_di_' + currentDI.numero_di, currentDI);
            showAlert('Dados exportados como JSON.', 'success');
        }
    } catch (error) {
        console.error('Erro na exportação:', error);
        showAlert('Erro ao exportar planilha: ' + error.message, 'danger');
    }
}

function exportarRelatórioImpostos() {
    if (!currentDI?.calculoImpostos) {
        showAlert('Calcule os impostos antes de exportar o relatório.', 'warning');
        return;
    }
    
    try {
        // Create a detailed tax report
        const report = createTaxReport(currentDI, currentDI.calculoImpostos);
        exportAsJSON('relatorio_impostos_' + currentDI.numero_di, report);
        showAlert('Relatório de impostos exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro na exportação:', error);
        showAlert('Erro ao exportar relatório: ' + error.message, 'danger');
    }
}

function exportarCroquiNF() {
    if (!currentDI) {
        showAlert('Nenhuma DI carregada para gerar croqui.', 'warning');
        return;
    }
    
    try {
        // Call the legacy croqui function if available
        if (typeof gerarCroquiPDFNovo === 'function') {
            gerarCroquiPDFNovo(currentDI);
            showAlert('Croqui NF gerado com sucesso!', 'success');
        } else {
            showAlert('Função de geração de croqui não disponível.', 'warning');
        }
    } catch (error) {
        console.error('Erro na geração do croqui:', error);
        showAlert('Erro ao gerar croqui: ' + error.message, 'danger');
    }
}

function exportarMemoriaCalculo() {
    if (!currentDI) {
        showAlert('Nenhuma DI carregada.', 'warning');
        return;
    }
    
    try {
        // Get calculation memory from the calculator
        const memory = complianceCalculator?.getHistoricoCalculos() || [];
        const memoryData = {
            di_numero: currentDI.numero_di,
            timestamp: new Date().toISOString(),
            calculationMemory: memory,
            summary: {
                total_calculations: memory.length,
                last_calculation: complianceCalculator?.getUltimoCalculo()
            }
        };
        
        exportAsJSON('memoria_calculo_' + currentDI.numero_di, memoryData);
        showAlert('Memória de cálculo exportada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro na exportação:', error);
        showAlert('Erro ao exportar memória de cálculo: ' + error.message, 'danger');
    }
}

/**
 * Export data as JSON file
 */
function exportAsJSON(filename, data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Create detailed tax report
 */
function createTaxReport(diData, calculations) {
    return {
        di_info: {
            numero: diData.numero_di,
            data: diData.data_registro,
            incoterm: diData.incoterm_identificado?.codigo
        },
        calculations: calculations,
        totals: {
            total_taxes: calculations?.totais?.total_impostos || 0,
            total_cost: calculations?.totais?.custo_total || 0
        },
        additions_summary: diData.adicoes?.map(adicao => ({
            numero: adicao.numero_adicao,
            ncm: adicao.ncm,
            value: adicao.valor_reais,
            weight: adicao.peso_liquido,
            taxes: {
                ii: adicao.tributos?.ii_valor_devido || 0,
                ipi: adicao.tributos?.ipi_valor_devido || 0,
                pis: adicao.tributos?.pis_valor_devido || 0,
                cofins: adicao.tributos?.cofins_valor_devido || 0
            }
        })) || [],
        generated_at: new Date().toISOString()
    };
}

function processarNovaDI() {
    // Reset system
    currentDI = null;
    currentStep = 1;
    document.getElementById('xmlFile').value = '';
    
    // Clear file info
    hideFileInfo();
    
    // Clear forms
    document.getElementById('expenseStorage').value = '0';
    document.getElementById('expenseTransport').value = '0';
    document.getElementById('expenseAgent').value = '0';
    
    document.getElementById('storageICMS').checked = false;
    document.getElementById('transportICMS').checked = false;
    document.getElementById('agentICMS').checked = false;
    
    // Go to step 1
    avancarStep(1);
    
    showAlert('Sistema resetado. Selecione uma nova DI.', 'info');
}

/**
 * Format currency values (Brazilian format)
 */
function formatCurrency(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) {
        return 'R$ 0,00';
    }
    
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format USD currency values
 */
function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
}

/**
 * Format currency with specific currency code
 */
function formatCurrencyWithCode(value, currencyCode) {
    // Convert currency code to symbol
    const currencyMap = {
        '220': 'USD',
        '978': 'EUR',
        '826': 'GBP',
        '156': 'CNY',
        '392': 'JPY',
        '124': 'CAD',
        '036': 'AUD'
    };
    
    const currency = currencyMap[currencyCode] || currencyCode;
    
    if (currency === 'USD') {
        return formatUSD(value);
    }
    
    // For other currencies, show with code
    return `${currency} ${formatNumber(value, 2)}`;
}

/**
 * Get currency label from currency code
 */
function getCurrencyLabel(currencyCode) {
    const currencyMap = {
        '220': 'USD',
        '978': 'EUR', 
        '826': 'GBP',
        '156': 'CNY',
        '392': 'JPY',
        '124': 'CAD',
        '036': 'AUD'
    };
    return currencyMap[currencyCode] || currencyCode;
}

/**
 * Format number (Brazilian format)
 */
function formatNumber(valor, decimals = 2) {
    if (valor === null || valor === undefined || isNaN(valor)) {
        return '0';
    }
    
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Update DI information display (copied from legacy system)
 */
function updateDIInfo(diData) {
    const diInfoDiv = document.querySelector('.di-summary') || createDISummaryDiv();
    
    if (diInfoDiv && diData) {
        // Calculate total values properly
        const totalFOB = diData.totais?.valor_total_fob_brl || 0;
        const totalAdicoes = diData.adicoes?.length || 0;
        
        diInfoDiv.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="bi bi-file-text"></i> DI ${diData.numero_di || 'N/A'}</h6>
                <div class="row">
                    <div class="col-md-6">
                        <small><strong>Data:</strong> ${diData.data_registro || 'N/A'}</small><br>
                        <small><strong>Importador:</strong> ${diData.importador?.nome || 'N/A'}</small><br>
                        <small><strong>URF:</strong> ${diData.urf_despacho_nome || 'N/A'}</small>
                    </div>
                    <div class="col-md-6">
                        <small><strong>Adições:</strong> ${totalAdicoes}</small><br>
                        <small><strong>Incoterm:</strong> ${diData.incoterm_identificado?.codigo || 'N/A'}</small><br>
                        <small><strong>Valor Total:</strong> ${formatCurrency(totalFOB)}</small>
                    </div>
                </div>
            </div>
        `;
        
        diInfoDiv.style.display = 'block';
    }
}

/**
 * Create DI summary div if it doesn't exist
 */
function createDISummaryDiv() {
    let diInfoDiv = document.getElementById('diSummary');
    if (!diInfoDiv) {
        diInfoDiv = document.createElement('div');
        diInfoDiv.id = 'diSummary';
        diInfoDiv.className = 'di-summary mb-4';
        
        // Insert at the beginning of step2
        const step2 = document.getElementById('step2');
        if (step2) {
            step2.insertBefore(diInfoDiv, step2.firstChild);
        }
    }
    return diInfoDiv;
}

/**
 * Utility functions
 */
function showLoading(message, detail) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingDetail').textContent = detail;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert_' + Date.now();
    
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const element = document.getElementById(alertId);
        if (element) {
            element.remove();
        }
    }, 5000);
}

// ===== DRAG & DROP FUNCTIONALITY (copiado do sistema legado funcionando) =====

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const fileInput = document.getElementById('xmlFile');
    const uploadArea = document.querySelector('.upload-area');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        uploadArea.addEventListener('click', () => fileInput.click());
    }
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
}

/**
 * Handle file drop
 */
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        
        // Validate file type
        if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
            // Set the file input and trigger processing
            const fileInput = document.getElementById('xmlFile');
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            console.log(`📁 Arquivo arrastado: ${file.name}`);
            showFileInfo(file);
            showAlert(`Arquivo "${file.name}" carregado. Clique em "Processar DI" para continuar.`, 'success');
        } else {
            showAlert('Por favor, arraste apenas arquivos XML.', 'warning');
        }
    }
}

// Make functions available globally for button onclick handlers
window.processarDI = processarDI;
window.calcularImpostos = calcularImpostos;
window.avancarStep = avancarStep;
window.voltarStep = voltarStep;
window.viewAdicaoDetails = viewAdicaoDetails;
window.exportarPlanilhaCustos = exportarPlanilhaCustos;
window.exportarRelatórioImpostos = exportarRelatórioImpostos;
window.exportarCroquiNF = exportarCroquiNF;
window.exportarMemoriaCalculo = exportarMemoriaCalculo;
window.processarNovaDI = processarNovaDI;
window.addExpenseRow = addExpenseRow;