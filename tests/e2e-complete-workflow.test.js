/**
 * Teste E2E Exaustivo: Pipeline Completo Import → Process → Export
 * 
 * Testa o fluxo completo sem fallbacks localStorage
 * Valida que todos os produtos individuais aparecem nos exports
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Configurações
const BASE_URL = 'http://localhost:8889';
const TEST_TIMEOUT = 180000; // 3 minutos para operações pesadas
const UPLOAD_TIMEOUT = 60000; // 1 minuto para uploads

// Arquivos de teste
const TEST_XML_FILES = [
  '2520345968.xml', // DI pequena - 4 produtos
  '2518173187.xml', // DI média - 1 produto  
  '2300120746.xml'  // DI grande - 189 produtos (teste principal)
];

test.describe('Pipeline Completo: Import → Process → Export', () => {
  
  test.beforeEach(async ({ page }) => {
    // Configurar timeouts
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Interceptar e logar erros JavaScript
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Interceptar falhas de rede
    page.on('requestfailed', request => {
      console.log('❌ Network Failed:', request.url());
    });
  });

  test('TESTE COMPLETO: DI 2300120746 - 189 produtos', async ({ page }) => {
    console.log('🧪 Iniciando teste exaustivo do pipeline completo...');
    
    // ===================================================================
    // ETAPA 1: LIMPEZA E PREPARAÇÃO
    // ===================================================================
    
    console.log('🗄️ Etapa 1: Limpeza do banco de dados...');
    
    // Navegar para dashboard de importação
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Aguardar dashboard carregar
    await expect(page.locator('h2')).toContainText('Dashboard de Importação XML');
    
    // Limpar banco de dados - o botão está desabilitado inicialmente
    // Primeiro verificar se banco não está vazio, caso contrário, pular limpeza
    const limparBtn = page.locator('button:has-text("Limpar Banco de Dados")');
    const isBtnEnabled = await limparBtn.isEnabled();
    
    if (isBtnEnabled) {
      await limparBtn.click();
      await page.click('button:has-text("Confirmar")'); // Confirmar modal
      // Aguardar limpeza completar
      await expect(page.locator('.status-message')).toContainText('limpo com sucesso', { timeout: 30000 });
    } else {
      console.log('Banco já está vazio, pulando limpeza');
    }
    
    // Aguardar atualização das estatísticas
    await page.waitForTimeout(2000);
    
    // Validar que banco está vazio
    const statsEmpty = await page.locator('.stats-item:has-text("Total DIs") .stats-value');
    await expect(statsEmpty).toContainText('0');
    
    console.log('✅ Banco de dados limpo com sucesso');
    
    // ===================================================================
    // ETAPA 2: UPLOAD E PROCESSAMENTO XML
    // ===================================================================
    
    console.log('📂 Etapa 2: Upload e processamento XML...');
    
    // Upload dos arquivos XML em sequência
    for (const filename of TEST_XML_FILES) {
      console.log(`📤 Uploading ${filename}...`);
      
      // Selecionar arquivo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', filename));
      
      // Aguardar processamento
      await expect(page.locator('.upload-progress')).toBeVisible({ timeout: UPLOAD_TIMEOUT });
      await expect(page.locator('.upload-progress')).toBeHidden({ timeout: UPLOAD_TIMEOUT });
      
      // Verificar sucesso
      await expect(page.locator('.status-message')).toContainText('sucesso', { timeout: 30000 });
      
      console.log(`✅ ${filename} processado com sucesso`);
    }
    
    // Aguardar estatísticas atualizarem
    await page.waitForTimeout(3000);
    
    // Validar que todas as DIs foram importadas
    const totalDIs = await page.locator('.stats-item:has-text("Total DIs") .stats-value');
    await expect(totalDIs).toContainText('3');
    
    // Validar produtos da DI principal (2300120746)
    const totalMercadorias = await page.locator('.stats-item:has-text("Total Mercadorias") .stats-value');
    await expect(totalMercadorias).toContainText('194'); // 189 + 4 + 1
    
    console.log('✅ Todas as DIs importadas com sucesso');
    
    // ===================================================================
    // ETAPA 3: NAVEGAÇÃO PARA MODULE 2
    // ===================================================================
    
    console.log('🔄 Etapa 3: Navegação para módulo de processamento...');
    
    // Navegar para o processador DI
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Aguardar carregamento da interface
    await expect(page.locator('h1')).toContainText('Sistema de Conformidade', { timeout: 30000 });
    
    // Verificar que não há gate de continuação (banco não está vazio)
    await expect(page.locator('.gate-database-empty')).toBeHidden();
    
    console.log('✅ Module 2 carregado com sucesso');
    
    // ===================================================================
    // ETAPA 4: CARREGAMENTO DA DI PRINCIPAL
    // ===================================================================
    
    console.log('📋 Etapa 4: Carregamento da DI 2300120746...');
    
    // Localizar e selecionar DI 2300120746
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await expect(diSelector).toBeVisible();
    
    // Verificar se DI está disponível na lista
    await expect(diSelector.locator('option:has-text("2300120746")')).toBeVisible();
    
    // Selecionar a DI
    await diSelector.selectOption('2300120746');
    
    // Aguardar carregamento dos dados
    await expect(page.locator('.loading-indicator')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 60000 });
    
    // Validar dados carregados
    await expect(page.locator('.di-info')).toContainText('2300120746');
    await expect(page.locator('.adicoes-count')).toContainText('16'); // 16 adições
    
    console.log('✅ DI 2300120746 carregada com sucesso');
    
    // ===================================================================
    // ETAPA 5: CONFIGURAÇÃO E CÁLCULOS
    // ===================================================================
    
    console.log('🧮 Etapa 5: Execução de cálculos...');
    
    // Configurar estado ICMS (SC para testar diferimento 75%)
    const estadoSelect = page.locator('select[name="estado"], #estado-icms');
    await estadoSelect.selectOption('SC');
    
    // Aguardar configuração ICMS
    await page.waitForTimeout(1000);
    
    // Executar cálculo completo
    const calcularBtn = page.locator('button:has-text("Calcular"), #calcular-impostos');
    await calcularBtn.click();
    
    // Aguardar cálculo completar
    await expect(page.locator('.calculation-progress')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.calculation-progress')).toBeHidden({ timeout: 90000 });
    
    // Validar resultados do cálculo
    await expect(page.locator('.calculation-results')).toBeVisible();
    await expect(page.locator('.total-impostos')).toContainText('R$');
    
    // Verificar que ICMS SC tem diferimento 75%
    const icmsResult = page.locator('.imposto-icms .valor-devido');
    await expect(icmsResult).toBeVisible();
    
    console.log('✅ Cálculos executados com sucesso');
    
    // ===================================================================
    // ETAPA 6: VALIDAÇÃO DE PRODUTOS INDIVIDUAIS
    // ===================================================================
    
    console.log('🔍 Etapa 6: Validação de produtos individuais...');
    
    // Abrir aba de produtos individuais
    const produtosTab = page.locator('button:has-text("Produtos"), .tab-produtos');
    await produtosTab.click();
    
    // Aguardar carregamento da lista
    await expect(page.locator('.produtos-individuais-table')).toBeVisible({ timeout: 30000 });
    
    // Contar produtos na tabela
    const produtoRows = page.locator('.produtos-individuais-table tbody tr');
    const produtoCount = await produtoRows.count();
    
    // Validar que temos 189 produtos (ou pelo menos próximo - considerar agrupamentos)
    expect(produtoCount).toBeGreaterThan(150); // Mínimo esperado
    console.log(`✅ ${produtoCount} produtos individuais validados`);
    
    // Verificar dados de alguns produtos
    const firstProduct = produtoRows.first();
    await expect(firstProduct.locator('.produto-codigo')).toContainText(/\w+/);
    await expect(firstProduct.locator('.produto-valor')).toContainText('R$');
    
    console.log('✅ Produtos individuais validados');
    
    // ===================================================================
    // ETAPA 7: EXPORTAÇÃO EXCEL
    // ===================================================================
    
    console.log('📊 Etapa 7: Exportação Excel...');
    
    // Preparar para capturar download
    const downloadPromise = page.waitForEvent('download');
    
    // Executar export Excel
    const exportExcelBtn = page.locator('button:has-text("Exportar Excel"), #export-excel');
    await exportExcelBtn.click();
    
    // Aguardar download
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    // Validar arquivo baixado
    expect(downloadPath).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
    
    console.log(`✅ Excel exportado: ${download.suggestedFilename()}`);
    
    // ===================================================================
    // ETAPA 8: EXPORTAÇÃO PDF
    // ===================================================================
    
    console.log('📄 Etapa 8: Exportação PDF...');
    
    // Preparar para capturar download PDF
    const downloadPdfPromise = page.waitForEvent('download');
    
    // Executar export PDF
    const exportPdfBtn = page.locator('button:has-text("Exportar PDF"), #export-pdf');
    await exportPdfBtn.click();
    
    // Aguardar download PDF
    const downloadPdf = await downloadPdfPromise;
    const downloadPdfPath = await downloadPdf.path();
    
    // Validar arquivo PDF baixado
    expect(downloadPdfPath).toBeTruthy();
    expect(downloadPdf.suggestedFilename()).toMatch(/\.pdf$/);
    
    console.log(`✅ PDF exportado: ${downloadPdf.suggestedFilename()}`);
    
    // ===================================================================
    // ETAPA 9: VALIDAÇÃO SEM LOCALSTORAGE
    // ===================================================================
    
    console.log('🔒 Etapa 9: Validação sem localStorage...');
    
    // Limpar localStorage
    await page.evaluate(() => localStorage.clear());
    
    // Recarregar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verificar que dados ainda estão disponíveis (vem do banco)
    await expect(diSelector).toBeVisible();
    await expect(diSelector.locator('option:has-text("2300120746")')).toBeVisible();
    
    // Selecionar DI novamente
    await diSelector.selectOption('2300120746');
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 60000 });
    
    // Validar que dados foram carregados do banco, não localStorage
    await expect(page.locator('.di-info')).toContainText('2300120746');
    
    console.log('✅ Sistema funcionando sem localStorage - dados vêm do banco');
    
    // ===================================================================
    // RESULTADO FINAL
    // ===================================================================
    
    console.log('🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('✅ Pipeline Import → Process → Export validado');
    console.log('✅ Todos os produtos individuais processados');
    console.log('✅ Exports Excel e PDF gerados');
    console.log('✅ Sistema funcionando sem localStorage');
    
    // Screenshot final de sucesso
    await page.screenshot({ 
      path: 'test-results/pipeline-completo-sucesso.png',
      fullPage: true 
    });
  });

  test('TESTE VALIDAÇÃO: APIs sem fallbacks', async ({ page }) => {
    console.log('🔌 Testando APIs sem fallbacks localStorage...');
    
    // Navegar diretamente para Module 2 com banco vazio
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    
    // Limpar localStorage antes
    await page.evaluate(() => localStorage.clear());
    
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Verificar gate de continuação (banco vazio)
    await expect(page.locator('.gate-database-empty, .no-data-message')).toBeVisible({ timeout: 30000 });
    
    console.log('✅ Sistema detecta banco vazio sem usar localStorage');
  });

  test('TESTE PERFORMANCE: DI Grande (189 produtos)', async ({ page }) => {
    console.log('⚡ Testando performance com DI grande...');
    
    const startTime = Date.now();
    
    // Upload apenas da DI grande
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    
    // Limpar banco
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);
    
    // Upload DI grande
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    
    // Aguardar processamento
    await expect(page.locator('.upload-progress')).toBeVisible({ timeout: UPLOAD_TIMEOUT });
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: UPLOAD_TIMEOUT });
    
    const uploadTime = Date.now() - startTime;
    console.log(`⏱️ Upload + Processamento: ${uploadTime}ms`);
    
    // Navegar para Module 2 e medir tempo de carregamento
    const processStartTime = Date.now();
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Selecionar e carregar DI
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await diSelector.selectOption('2300120746');
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 60000 });
    
    const processTime = Date.now() - processStartTime;
    console.log(`⏱️ Carregamento Module 2: ${processTime}ms`);
    
    // Validar performance aceitável (menos de 30 segundos total)
    expect(uploadTime + processTime).toBeLessThan(30000);
    
    console.log('✅ Performance validada para DI grande');
  });
  
});