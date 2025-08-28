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
    
    // Expense inputs with real-time preview
    const expenseInputs = ['expenseStorage', 'expenseTransport', 'expenseAgent'];
    const icmsCheckboxes = ['storageICMS', 'transportICMS', 'agentICMS'];
    
    expenseInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateExpensePreview);
        }
    });
    
    icmsCheckboxes.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateExpensePreview);
        }
    });
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
    // Basic DI info
    document.getElementById('diNumber').textContent = diData.di_numero || 'N/A';
    document.getElementById('diDate').textContent = diData.data_registro || 'N/A';
    document.getElementById('diIncoterm').textContent = diData.incoterm?.codigo || 'N/A';
    
    // First addition data (most DIs have one main addition)
    const firstAddition = diData.adicoes?.[0];
    if (firstAddition) {
        document.getElementById('diCifValue').textContent = `R$ ${firstAddition.valor_reais?.toFixed(2) || '0,00'}`;
        document.getElementById('productNCM').textContent = firstAddition.ncm || 'N/A';
        document.getElementById('productDesc').textContent = firstAddition.descricao_ncm || 'N/A';
        document.getElementById('productWeight').textContent = `${firstAddition.peso_liquido?.toFixed(2) || '0'} kg`;
        document.getElementById('supplierName').textContent = firstAddition.fornecedor?.nome || 'N/A';
    }
    
    // Automatic expenses using legacy parser structure
    populateAutomaticExpenses(diData.despesas_aduaneiras);
    
    // Initialize expense preview
    updateExpensePreview();
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
                            <span class="text-success">R$ ${expense.value.toFixed(2)}</span>
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
            <strong><i class="bi bi-calculator"></i> Total Despesas Automáticas: R$ ${(despesasAuto.total || 0).toFixed(2)}</strong>
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
 * Update expense preview in real time
 */
function updateExpensePreview() {
    if (!currentDI) return;
    
    // Get expense values
    const storage = parseFloat(document.getElementById('expenseStorage').value) || 0;
    const transport = parseFloat(document.getElementById('expenseTransport').value) || 0;
    const agent = parseFloat(document.getElementById('expenseAgent').value) || 0;
    
    // Get ICMS checkboxes
    const storageICMS = document.getElementById('storageICMS').checked;
    const transportICMS = document.getElementById('transportICMS').checked;
    const agentICMS = document.getElementById('agentICMS').checked;
    
    // Calculate totals
    const totalExtra = storage + transport + agent;
    const totalExtraICMS = 
        (storageICMS ? storage : 0) +
        (transportICMS ? transport : 0) +
        (agentICMS ? agent : 0);
    
    // Calculate ICMS impact using parser legado structure
    const automaticExpenses = currentDI.despesas_aduaneiras?.total_despesas_aduaneiras || 0;
    const baseICMSBefore = automaticExpenses;
    const baseICMSAfter = automaticExpenses + totalExtraICMS;
    const icmsDifference = (baseICMSAfter - baseICMSBefore) * 0.17 / 0.83; // Approximate ICMS calculation
    
    // Update preview
    document.getElementById('previewTotalExtra').textContent = `R$ ${totalExtra.toFixed(2)}`;
    document.getElementById('previewICMSBefore').textContent = `R$ ${baseICMSBefore.toFixed(2)}`;
    document.getElementById('previewICMSAfter').textContent = `R$ ${baseICMSAfter.toFixed(2)}`;
    document.getElementById('previewICMSDiff').textContent = `R$ ${icmsDifference.toFixed(2)}`;
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
        
        // Configure extra expenses
        const extraExpenses = {
            armazenagem: parseFloat(document.getElementById('expenseStorage').value) || 0,
            transporte_interno: parseFloat(document.getElementById('expenseTransport').value) || 0,
            despachante: parseFloat(document.getElementById('expenseAgent').value) || 0,
            
            // ICMS classification
            armazenagem_icms: document.getElementById('storageICMS').checked,
            transporte_interno_icms: document.getElementById('transportICMS').checked,
            despachante_icms: document.getElementById('agentICMS').checked
        };
        
        // Get consolidated expenses using legacy method
        const despesasConsolidadas = diProcessor.consolidarDespesasCompletas(extraExpenses);
        
        // Calculate taxes for first addition (main product)
        const firstAddition = currentDI.adicoes[0];
        const taxCalculation = complianceCalculator.calcularImpostosImportacao(firstAddition, despesasConsolidadas);
        
        // Store calculation results
        currentDI.calculoImpostos = taxCalculation;
        
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
                    <h4 class="text-primary">R$ ${calculation.impostos.ii.valor_devido.toFixed(2)}</h4>
                    <small class="text-muted">${calculation.impostos.ii.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <h6 class="card-title">IPI</h6>
                    <h4 class="text-primary">R$ ${calculation.impostos.ipi.valor_devido.toFixed(2)}</h4>
                    <small class="text-muted">${calculation.impostos.ipi.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <h6 class="card-title">PIS/COFINS</h6>
                    <h4 class="text-primary">R$ ${(calculation.impostos.pis.valor_devido + calculation.impostos.cofins.valor_devido).toFixed(2)}</h4>
                    <small class="text-muted">11.75%</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center border-primary">
                <div class="card-body">
                    <h6 class="card-title">ICMS</h6>
                    <h4 class="text-primary">R$ ${calculation.impostos.icms.valor_devido.toFixed(2)}</h4>
                    <small class="text-muted">${calculation.impostos.icms.aliquota}%</small>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="alert alert-primary text-center">
                <h4><strong>Total Impostos: R$ ${calculation.totais.total_impostos.toFixed(2)}</strong></h4>
                <p class="mb-0">Custo Total da Importação: <strong>R$ ${calculation.totais.custo_total.toFixed(2)}</strong></p>
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
                        <td class="text-end">R$ ${calculation.valores_base.cif_brl.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>II</td>
                        <td class="text-end">R$ ${calculation.impostos.ii.valor_devido.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>IPI</td>
                        <td class="text-end">R$ ${calculation.impostos.ipi.valor_devido.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PIS</td>
                        <td class="text-end">R$ ${calculation.impostos.pis.valor_devido.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>COFINS</td>
                        <td class="text-end">R$ ${calculation.impostos.cofins.valor_devido.toFixed(2)}</td>
                    </tr>
                    <tr class="table-primary">
                        <td><strong>Despesas Aduaneiras</strong></td>
                        <td class="text-end"><strong>R$ ${calculation.despesas.total_base_icms.toFixed(2)}</strong></td>
                    </tr>
                    <tr class="table-info">
                        <td><strong>Base ICMS Final</strong></td>
                        <td class="text-end"><strong>R$ ${calculation.impostos.icms.base_calculo_final.toFixed(2)}</strong></td>
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
                    <li><strong>Custo por kg:</strong> R$ ${calculation.totais.custo_por_kg.toFixed(2)}</li>
                </ul>
                
                ${calculation.despesas.extras_tributaveis > 0 ? `
                    <div class="alert alert-info small">
                        <i class="bi bi-exclamation-circle"></i>
                        <strong>Despesas Extras Incluídas:</strong><br>
                        R$ ${calculation.despesas.extras_tributaveis.toFixed(2)} adicionados à base ICMS
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
    document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    
    // Update step indicator
    updateStepIndicator(stepNumber);
    
    currentStep = stepNumber;
    
    // Scroll to top
    window.scrollTo(0, 0);
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
    if (!currentDI?.calculoImpostos) {
        showAlert('Calcule os impostos antes de exportar.', 'warning');
        return;
    }
    
    // Implementation would create Excel file
    showAlert('Funcionalidade de exportação será implementada.', 'info');
}

function exportarRelatórioImpostos() {
    if (!currentDI?.calculoImpostos) {
        showAlert('Calcule os impostos antes de exportar.', 'warning');
        return;
    }
    
    // Implementation would create detailed report
    showAlert('Funcionalidade de exportação será implementada.', 'info');
}

function exportarCroquiNF() {
    if (!currentDI?.calculoImpostos) {
        showAlert('Calcule os impostos antes de exportar.', 'warning');
        return;
    }
    
    // Implementation would create PDF croqui
    showAlert('Funcionalidade de exportação será implementada.', 'info');
}

function exportarMemoriaCalculo() {
    if (!currentDI?.calculoImpostos) {
        showAlert('Calcule os impostos antes de exportar.', 'warning');
        return;
    }
    
    // Implementation would create calculation memory
    showAlert('Funcionalidade de exportação será implementada.', 'info');
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
window.exportarPlanilhaCustos = exportarPlanilhaCustos;
window.exportarRelatórioImpostos = exportarRelatórioImpostos;
window.exportarCroquiNF = exportarCroquiNF;
window.exportarMemoriaCalculo = exportarMemoriaCalculo;
window.processarNovaDI = processarNovaDI;