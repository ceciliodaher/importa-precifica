/**
 * ImportDashboard.js - Controller para Dashboard de Importação XML
 * Sistema Expertzy - Módulo de Importação de Dados
 */

class ImportDashboard {
    constructor() {
        this.files = [];
        this.currentFileIndex = 0;
        this.importStats = {
            success: 0,
            duplicates: 0,
            errors: 0,
            totalProcessed: 0
        };
        this.isProcessing = false;
        this.initializeElements();
        this.attachEventListeners();
        this.loadInitialStats();
    }

    initializeElements() {
        // Upload elements
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.filesList = document.getElementById('filesList');
        this.filesContainer = document.getElementById('filesContainer');
        this.startImportBtn = document.getElementById('startImportBtn');
        this.clearFilesBtn = document.getElementById('clearFilesBtn');
        
        // Progress elements
        this.progressSection = document.getElementById('progressSection');
        this.progressBar = document.getElementById('progressBar');
        this.currentFileInfo = document.getElementById('currentFileInfo');
        
        // Stats elements
        this.statTotalDIs = document.getElementById('statTotalDIs');
        this.statTotalAdicoes = document.getElementById('statTotalAdicoes');
        this.statTotalMercadorias = document.getElementById('statTotalMercadorias');
        this.statLastImport = document.getElementById('statLastImport');
        
        // Status elements
        this.sessionSuccess = document.getElementById('sessionSuccess');
        this.sessionDuplicates = document.getElementById('sessionDuplicates');
        this.sessionErrors = document.getElementById('sessionErrors');
        
        // Log element
        this.logContainer = document.getElementById('logContainer');
        
        // Action buttons
        this.validateDBBtn = document.getElementById('validateDBBtn');
        this.exportLogBtn = document.getElementById('exportLogBtn');
        this.clearDBBtn = document.getElementById('clearDBBtn');
        this.continueToSystemBtn = document.getElementById('continueToSystemBtn');
    }

    attachEventListeners() {
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // File selection
        this.selectFilesBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Action buttons
        this.startImportBtn.addEventListener('click', () => this.startImport());
        this.clearFilesBtn.addEventListener('click', () => this.clearFiles());
        this.validateDBBtn.addEventListener('click', () => this.validateDatabase());
        this.exportLogBtn.addEventListener('click', () => this.exportLog());
        this.clearDBBtn.addEventListener('click', () => this.clearDatabase());
        this.continueToSystemBtn.addEventListener('click', () => this.continueToSystem());
    }

    // Drag and Drop handlers
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.name.toLowerCase().endsWith('.xml')
        );
        
        if (files.length > 0) {
            this.addFiles(files);
        } else {
            this.showAlert('Por favor, selecione apenas arquivos XML.', 'warning');
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(files) {
        this.files = [...this.files, ...files];
        this.displayFiles();
        this.filesList.style.display = 'block';
    }

    displayFiles() {
        this.filesContainer.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item d-flex justify-content-between align-items-center p-2 mb-2 border rounded';
            fileItem.innerHTML = `
                <div>
                    <i class="bi bi-file-earmark-code text-primary me-2"></i>
                    <span>${file.name}</span>
                    <small class="text-muted ms-2">(${this.formatFileSize(file.size)})</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="dashboard.removeFile(${index})">
                    <i class="bi bi-x"></i>
                </button>
            `;
            this.filesContainer.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.displayFiles();
        
        if (this.files.length === 0) {
            this.filesList.style.display = 'none';
        }
    }

    clearFiles() {
        this.files = [];
        this.filesContainer.innerHTML = '';
        this.filesList.style.display = 'none';
        this.fileInput.value = '';
    }

    async startImport() {
        if (this.files.length === 0) {
            this.showAlert('Nenhum arquivo selecionado.', 'warning');
            return;
        }

        this.isProcessing = true;
        this.currentFileIndex = 0;
        this.importStats = { success: 0, duplicates: 0, errors: 0, totalProcessed: 0 };
        
        // Update UI
        this.startImportBtn.disabled = true;
        this.clearFilesBtn.disabled = true;
        this.progressSection.style.display = 'block';
        this.clearLog();
        this.updateStatus('processing');
        
        // Show session stats
        document.querySelector('.stats-summary').style.display = 'block';
        
        // Process files sequentially
        for (let i = 0; i < this.files.length; i++) {
            this.currentFileIndex = i;
            await this.processFile(this.files[i]);
        }
        
        this.finishImport();
    }

    async processFile(file) {
        const progress = ((this.currentFileIndex + 1) / this.files.length * 100).toFixed(0);
        this.updateProgress(progress, `Processando: ${file.name}`);
        this.addLog(`Iniciando processamento de ${file.name}`, 'info');
        
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('acao', 'processar');
        
        try {
            const response = await fetch('api/import.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.importStats.success += result.dis_processadas || 1;
                this.addLog(`✓ ${file.name} processado com sucesso`, 'success');
                
                // Log details if available
                if (result.details) {
                    this.addLog(`  → ${result.details.adicoes} adições, ${result.details.mercadorias} mercadorias`, 'info');
                }
            } else if (result.duplicate) {
                this.importStats.duplicates++;
                this.addLog(`⚠ ${file.name} já existe no banco (DI: ${result.numero_di})`, 'warning');
            } else {
                this.importStats.errors++;
                this.addLog(`✗ Erro ao processar ${file.name}: ${result.error}`, 'error');
            }
        } catch (error) {
            this.importStats.errors++;
            this.addLog(`✗ Erro de conexão ao processar ${file.name}`, 'error');
            console.error('Error processing file:', error);
        }
        
        this.importStats.totalProcessed++;
        this.updateSessionStats();
    }

    finishImport() {
        this.isProcessing = false;
        this.startImportBtn.disabled = false;
        this.clearFilesBtn.disabled = false;
        this.updateStatus('completed');
        
        // Update progress
        this.updateProgress(100, 'Importação concluída');
        
        // Show summary
        const summary = `Importação concluída: ${this.importStats.success} sucesso, ` +
                       `${this.importStats.duplicates} duplicadas, ${this.importStats.errors} erros`;
        this.addLog(summary, this.importStats.errors > 0 ? 'warning' : 'success');
        
        // Reload stats
        this.loadInitialStats();
        
        // Clear files list after successful import
        if (this.importStats.success > 0) {
            setTimeout(() => {
                this.clearFiles();
                this.progressSection.style.display = 'none';
            }, 3000);
        }
    }

    updateProgress(percentage, info) {
        this.progressBar.style.width = percentage + '%';
        this.progressBar.textContent = percentage + '%';
        this.currentFileInfo.textContent = info;
    }

    updateStatus(status) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = statusIndicator.nextElementSibling;
        
        statusIndicator.className = 'status-indicator';
        
        switch(status) {
            case 'idle':
                statusIndicator.classList.add('status-idle');
                statusText.textContent = 'Aguardando arquivos';
                break;
            case 'processing':
                statusIndicator.classList.add('status-processing');
                statusText.textContent = 'Processando...';
                break;
            case 'completed':
                statusIndicator.classList.add('status-completed');
                statusText.textContent = 'Importação concluída';
                break;
            case 'error':
                statusIndicator.classList.add('status-error');
                statusText.textContent = 'Erro na importação';
                break;
        }
    }

    updateSessionStats() {
        this.sessionSuccess.textContent = this.importStats.success;
        this.sessionDuplicates.textContent = this.importStats.duplicates;
        this.sessionErrors.textContent = this.importStats.errors;
    }

    addLog(message, type = 'info') {
        if (this.logContainer.querySelector('.text-center')) {
            this.clearLog();
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clearLog() {
        this.logContainer.innerHTML = '';
    }

    async loadInitialStats() {
        try {
            const response = await fetch('api/stats.php');
            const stats = await response.json();
            
            this.statTotalDIs.textContent = stats.total_dis || 0;
            this.statTotalAdicoes.textContent = stats.total_adicoes || 0;
            this.statTotalMercadorias.textContent = stats.total_mercadorias || 0;
            this.statLastImport.textContent = stats.last_import || '-';
            
            // Enable/disable buttons based on database state
            const hasDIs = stats.total_dis > 0;
            this.clearDBBtn.disabled = !hasDIs;
            this.continueToSystemBtn.disabled = !hasDIs;
            
            // Store state in localStorage
            if (hasDIs) {
                localStorage.setItem('expertzy_db_populated', 'true');
                localStorage.setItem('expertzy_db_stats', JSON.stringify(stats));
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.addLog('Erro ao carregar estatísticas do banco', 'error');
        }
    }

    async validateDatabase() {
        this.addLog('Verificando conexão com banco de dados...', 'info');
        
        try {
            const response = await fetch('api/validate.php');
            const result = await response.json();
            
            if (result.connected) {
                this.addLog('✓ Banco de dados conectado e operacional', 'success');
                this.addLog(`  → ${result.tables} tabelas encontradas`, 'info');
            } else {
                this.addLog('✗ Erro na conexão com banco de dados', 'error');
            }
        } catch (error) {
            this.addLog('✗ Não foi possível validar o banco de dados', 'error');
        }
    }

    async clearDatabase() {
        if (!confirm('Tem certeza que deseja limpar todo o banco de dados?\nEsta ação não pode ser desfeita.')) {
            return;
        }
        
        this.addLog('Limpando banco de dados...', 'warning');
        
        try {
            const response = await fetch('api/clear.php', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.addLog('✓ Banco de dados limpo com sucesso', 'success');
                localStorage.removeItem('expertzy_db_populated');
                localStorage.removeItem('expertzy_db_stats');
                this.loadInitialStats();
            } else {
                this.addLog('✗ Erro ao limpar banco de dados', 'error');
            }
        } catch (error) {
            this.addLog('✗ Erro na operação de limpeza', 'error');
        }
    }

    async exportLog() {
        this.addLog('Exportando logs...', 'info');
        
        try {
            const response = await fetch('api/export-log.php?format=json&download=true');
            
            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }
            
            // Criar download do arquivo JSON
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `import-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.addLog('✓ Log exportado com sucesso', 'success');
            
        } catch (error) {
            this.addLog('✗ Erro ao exportar log: ' + error.message, 'error');
        }
    }
    
    async viewLogReport() {
        try {
            const response = await fetch('api/export-log.php?format=html');
            
            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }
            
            const html = await response.text();
            const newWindow = window.open('', '_blank', 'width=1000,height=700');
            newWindow.document.write(html);
            newWindow.document.close();
            
        } catch (error) {
            this.addLog('✗ Erro ao abrir relatório: ' + error.message, 'error');
        }
    }

    continueToSystem() {
        window.location.href = '../di-processing/di-processor.html';
    }

    showAlert(message, type = 'info') {
        // Create Bootstrap alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ImportDashboard();
});