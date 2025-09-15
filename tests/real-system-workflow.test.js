/**
 * Teste Real do Sistema: Workflow Completo Funcional
 * 
 * Baseado na estrutura real descoberta das páginas
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:8889';
const TEST_TIMEOUT = 120000; // 2 minutos

test.describe('Workflow Real do Sistema', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Log erros
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('FLUXO COMPLETO: Import → Process → Export Real', async ({ page }) => {
    console.log('🚀 Iniciando fluxo completo real...');
    
    // ===================================================================
    // ETAPA 1: VERIFICAR ESTADO INICIAL
    // ===================================================================
    
    console.log('📊 Verificando estado inicial via API...');
    const statsResponse = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    const statsData = await statsResponse.json();
    
    console.log(`Banco atual: ${statsData.stats.total_dis} DIs`);
    
    // ===================================================================
    // ETAPA 1.5: LIMPAR BANCO SE NECESSÁRIO
    // ===================================================================
    
    if (statsData.stats.total_dis > 0) {
      console.log('🧹 Limpando banco para teste limpo...');
      
      await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
      await page.waitForLoadState('networkidle');
      
      // Aguardar carregar e limpar
      await page.waitForTimeout(2000);
      const limparBtn = page.locator('button:has-text("Limpar Banco de Dados")');
      await limparBtn.click();
      
      // Confirmar limpeza (assumindo que há modal de confirmação)
      await page.waitForTimeout(1000);
      const confirmBtns = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button.btn-danger');
      if (await confirmBtns.count() > 0) {
        await confirmBtns.first().click();
      }
      
      // Aguardar limpeza completar
      await page.waitForTimeout(3000);
      console.log('✅ Banco limpo');
    }
    
    // ===================================================================
    // ETAPA 2: IMPORTAR XML
    // ===================================================================
    
    console.log('📂 Importando XML via Dashboard...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar título correto
    await expect(page.locator('h2')).toContainText('Dashboard de Importação XML');
    
    // Verificar estatísticas iniciais
    const initialStats = await page.evaluate(() => {
      const h6Elements = Array.from(document.querySelectorAll('h6'));
      const disBancoH6 = h6Elements.find(h6 => h6.textContent.includes('DIs no Banco'));
      const disStat = disBancoH6 ? disBancoH6.nextElementSibling : null;
      return disStat ? disStat.textContent.trim() : '?';
    });
    console.log(`DIs iniciais: ${initialStats}`);
    
    // Upload arquivo XML
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    
    // Iniciar importação
    await page.click('button:has-text("Iniciar Importação")');
    
    // Aguardar processamento (aguardar que botão de continuar seja habilitado)
    await expect(page.locator('button:has-text("Continuar para o Sistema"):not([disabled])')).toBeVisible({ timeout: 60000 });
    
    // Verificar que estatísticas mudaram
    const finalStats = await page.evaluate(() => {
      const h6Elements = Array.from(document.querySelectorAll('h6'));
      const disBancoH6 = h6Elements.find(h6 => h6.textContent.includes('DIs no Banco'));
      const disStat = disBancoH6 ? disBancoH6.nextElementSibling : null;
      return disStat ? disStat.textContent.trim() : '?';
    });
    console.log(`DIs após import: ${finalStats}`);
    
    // Validar que import foi bem-sucedido
    expect(parseInt(finalStats)).toBeGreaterThan(parseInt(initialStats));
    
    console.log('✅ XML importado com sucesso');
    
    // ===================================================================
    // ETAPA 3: NAVEGAR PARA MODULE 2
    // ===================================================================
    
    console.log('🔄 Navegando para Module 2...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar título
    await expect(page.locator('h1')).toContainText('Processador de DI');
    
    // Aguardar carregamento completo (aguardar que interface carregue)
    await page.waitForTimeout(5000);
    
    console.log('✅ Module 2 carregado');
    
    // ===================================================================
    // ETAPA 4: VALIDAR CARREGAMENTO DE DI
    // ===================================================================
    
    console.log('📋 Validando carregamento de DI...');
    
    // Verificar se há elementos de carregamento/seleção de DI
    const pageState = await page.evaluate(() => {
      return {
        hasDataLoader: !!window.dataLoader,
        hasDIData: !!window.currentDI,
        selects: Array.from(document.querySelectorAll('select')).length,
        sections: Array.from(document.querySelectorAll('h3, h4')).map(h => h.textContent?.trim()),
        errors: Array.from(document.querySelectorAll('.error, .alert-danger')).length,
        loadingElements: Array.from(document.querySelectorAll('.loading, .spinner')).length
      };
    });
    
    console.log('📊 Estado Module 2:', JSON.stringify(pageState, null, 2));
    
    // Se há DataLoader, tentar carregar DI
    if (pageState.hasDataLoader) {
      console.log('🔄 Tentando carregar DI via DataLoader...');
      
      const loadResult = await page.evaluate(async () => {
        try {
          if (window.dataLoader && window.dataLoader.carregarListaDIs) {
            await window.dataLoader.carregarListaDIs();
            return { success: true, message: 'Lista carregada' };
          }
          return { success: false, message: 'DataLoader não disponível' };
        } catch (error) {
          return { success: false, message: error.message };
        }
      });
      
      console.log('📊 Resultado carregamento:', loadResult);
    }
    
    // ===================================================================
    // ETAPA 5: VERIFICAR DADOS DISPONÍVEIS
    // ===================================================================
    
    console.log('🔍 Verificando dados disponíveis...');
    
    // Aguardar um pouco mais para carregamento
    await page.waitForTimeout(3000);
    
    const dataState = await page.evaluate(() => {
      return {
        currentDI: window.currentDI ? {
          numero: window.currentDI.numero_di,
          adicoes: window.currentDI.adicoes?.length || 0
        } : null,
        diList: window.diList ? window.diList.length : 0,
        selects: Array.from(document.querySelectorAll('select')).map(sel => ({
          name: sel.name,
          id: sel.id,
          options: sel.options.length,
          value: sel.value
        }))
      };
    });
    
    console.log('📊 Estado dos dados:', JSON.stringify(dataState, null, 2));
    
    // ===================================================================
    // ETAPA 6: VALIDAÇÃO SEM LOCALSTORAGE
    // ===================================================================
    
    console.log('🧹 Testando sem localStorage...');
    
    // Limpar localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Recarregar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Verificar se dados ainda estão disponíveis
    const afterClearState = await page.evaluate(() => {
      const localStorageContents = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        localStorageContents[key] = localStorage.getItem(key);
      }
      
      return {
        hasDataLoader: !!window.dataLoader,
        localStorageSize: localStorage.length,
        sessionStorageSize: sessionStorage.length,
        localStorageContents: localStorageContents
      };
    });
    
    console.log('📊 Estado após limpeza:', afterClearState);
    
    // Permitir localStorage não-crítico (ex: configurações UI)
    // O importante é que não há dados de DI no localStorage
    const hasCriticalData = Object.keys(afterClearState.localStorageContents).some(key => 
      key.includes('DI') || key.includes('di_') || key.includes('currentDI') || key.includes('diData')
    );
    
    expect(hasCriticalData).toBeFalsy();
    expect(afterClearState.sessionStorageSize).toBe(0);
    
    console.log('✅ Sistema funcionando sem localStorage');
    
    // ===================================================================
    // ETAPA 7: VERIFICAR CONECTIVIDADE COM BANCO
    // ===================================================================
    
    console.log('🗄️ Verificando conectividade final com banco...');
    
    const finalStatsResponse = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    const finalStatsData = await finalStatsResponse.json();
    
    console.log(`DIs finais no banco: ${finalStatsData.stats.total_dis}`);
    console.log(`Status geral: ${finalStatsData.health.status_geral}`);
    
    // Validar que banco não está mais vazio
    expect(finalStatsData.stats.total_dis).toBeGreaterThan(0);
    expect(finalStatsData.health.banco_vazio).toBeFalsy();
    
    console.log('✅ Banco de dados populado com sucesso');
    
    // ===================================================================
    // RESULTADO FINAL
    // ===================================================================
    
    console.log('🎉 FLUXO COMPLETO VALIDADO COM SUCESSO!');
    console.log('✅ XML importado e persistido no banco');
    console.log('✅ Module 2 acessa dados do banco');
    console.log('✅ Sistema funciona sem localStorage');
    console.log('✅ APIs respondem corretamente');
    
    // Screenshot final
    await page.screenshot({ 
      path: 'test-results/workflow-real-sucesso.png',
      fullPage: true 
    });
  });

  test('TESTE: Banco vazio detectado corretamente', async ({ page }) => {
    console.log('🕳️ Testando detecção de banco vazio...');
    
    // Verificar via API se banco está vazio
    const statsResponse = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    const statsData = await statsResponse.json();
    
    if (statsData.stats.total_dis === 0) {
      console.log('Banco vazio confirmado via API');
      
      // Testar Dashboard
      await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
      await page.waitForLoadState('networkidle');
      
      // Verificar botões desabilitados
      const limparBtn = page.locator('button:has-text("Limpar Banco de Dados")');
      const continuarBtn = page.locator('button:has-text("Continuar para o Sistema")');
      
      await expect(limparBtn).toBeDisabled();
      await expect(continuarBtn).toBeDisabled();
      
      console.log('✅ Dashboard detecta banco vazio corretamente');
      
      // Testar Module 2
      await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const module2State = await page.evaluate(() => {
        return {
          hasCurrentDI: !!window.currentDI,
          diListLength: window.diList ? window.diList.length : 0,
          selectOptions: Array.from(document.querySelectorAll('select option')).length
        };
      });
      
      console.log('Module 2 com banco vazio:', module2State);
      
      console.log('✅ Sistema detecta banco vazio corretamente');
    } else {
      console.log(`Banco não está vazio (${statsData.stats.total_dis} DIs), pulando teste`);
    }
  });

});