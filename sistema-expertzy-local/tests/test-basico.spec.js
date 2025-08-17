// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sistema Expertzy - Testes Básicos', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });
    
    // Capturar exceções não tratadas
    page.on('pageerror', error => {
      console.error(`Page Error: ${error.message}`);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Deve carregar a página sem erros', async () => {
    // Navegar para o sistema via localhost
    await page.goto('http://localhost:8080/sistema-importacao.html');
    
    // Verificar título
    await expect(page).toHaveTitle(/Sistema de Importação - Expertzy/);
    
    // Capturar screenshot inicial
    await page.screenshot({ path: 'tests/screenshots/01-pagina-inicial.png' });
    
    // Verificar elementos essenciais
    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('[data-tab="upload"]')).toBeVisible();
    await expect(page.locator('[data-tab="dados"]')).toBeVisible();
    await expect(page.locator('[data-tab="custos"]')).toBeVisible();
  });

  test('Deve aceitar upload de arquivo XML', async () => {
    const filePath = path.join(__dirname, '..', 'samples', '2300120746.xml');
    
    // Fazer upload do arquivo
    const fileInput = page.locator('#xmlFile');
    await fileInput.setInputFiles(filePath);
    
    // Aguardar processamento
    await page.waitForTimeout(2000);
    
    // Capturar screenshot após upload
    await page.screenshot({ path: 'tests/screenshots/02-apos-upload.png' });
    
    // Verificar se informações da DI aparecem
    const diInfo = page.locator('#diInfo');
    await expect(diInfo).toBeVisible({ timeout: 5000 });
  });

  test('Deve habilitar abas após processar XML', async () => {
    // Verificar se aba de dados foi habilitada
    const dadosTab = page.locator('[data-tab="dados"]');
    await expect(dadosTab).not.toHaveClass(/disabled/);
    
    // Verificar se aba de custos foi habilitada
    const custosTab = page.locator('[data-tab="custos"]');
    await expect(custosTab).not.toHaveClass(/disabled/);
    
    // Capturar screenshot das abas habilitadas
    await page.screenshot({ path: 'tests/screenshots/03-abas-habilitadas.png' });
  });

  test('Deve navegar para aba de dados e mostrar informações', async () => {
    // Clicar na aba de dados
    await page.click('[data-tab="dados"]');
    await page.waitForTimeout(1000);
    
    // Verificar se tabela de adições existe
    const tabelaAdicoes = page.locator('#adicoesTable');
    await expect(tabelaAdicoes).toBeVisible();
    
    // Verificar se há dados na tabela
    const linhasTabela = page.locator('#adicoesTable tbody tr');
    const count = await linhasTabela.count();
    expect(count).toBeGreaterThan(0);
    
    // Capturar screenshot da aba de dados
    await page.screenshot({ path: 'tests/screenshots/04-aba-dados.png' });
  });

  test('Deve permitir configuração de custos extras', async () => {
    // Navegar para aba de custos
    await page.click('[data-tab="custos"]');
    await page.waitForTimeout(1000);
    
    // Verificar se interface de custos está visível
    const custosInterface = page.locator('#custosInterface');
    await expect(custosInterface).toBeVisible();
    
    // Preencher custos de teste
    await page.fill('#custosPortuarios', '1000');
    await page.fill('#custosBancarios', '500');
    await page.fill('#custosLogisticos', '1500');
    await page.fill('#custosAdministrativos', '800');
    
    // Verificar se totais são atualizados
    await page.waitForTimeout(500);
    
    // Capturar screenshot da configuração de custos
    await page.screenshot({ path: 'tests/screenshots/05-custos-configurados.png' });
    
    // Verificar total geral
    const totalGeral = page.locator('#totalGeral');
    await expect(totalGeral).toContainText('3.800');
  });

  test('Deve executar cálculos ao clicar no botão', async () => {
    // Selecionar estado
    await page.selectOption('#estadoDestino', 'GO');
    
    // Clicar no botão de cálculo
    await page.click('#calculateAll');
    
    // Aguardar processamento
    await page.waitForTimeout(3000);
    
    // Verificar se foi para aba de resultados
    const resultadosTab = page.locator('[data-tab="resultados"]');
    await expect(resultadosTab).toHaveClass(/active/);
    
    // Verificar se resultados são exibidos
    const resultadosInterface = page.locator('#resultadosInterface');
    await expect(resultadosInterface).toBeVisible();
    
    // Capturar screenshot dos resultados
    await page.screenshot({ path: 'tests/screenshots/06-resultados-calculados.png' });
  });

  test('Deve expandir e recolher itens na tabela de resultados', async () => {
    // Verificar se há linhas de adição
    const adicaoRows = page.locator('.adicao-row');
    const count = await adicaoRows.count();
    expect(count).toBeGreaterThan(0);
    
    // Clicar para expandir primeira adição
    await adicaoRows.first().click();
    await page.waitForTimeout(500);
    
    // Verificar se itens aparecem
    const itemRows = page.locator('.item-row');
    await expect(itemRows.first()).toBeVisible();
    
    // Capturar screenshot expandido
    await page.screenshot({ path: 'tests/screenshots/07-tabela-expandida.png' });
    
    // Clicar para recolher
    await adicaoRows.first().click();
    await page.waitForTimeout(500);
    
    // Verificar se itens foram ocultados
    await expect(itemRows.first()).not.toBeVisible();
    
    // Capturar screenshot recolhido
    await page.screenshot({ path: 'tests/screenshots/08-tabela-recolhida.png' });
  });

  test('Deve salvar dados no localStorage', async () => {
    // Verificar se dados foram salvos
    const storageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const expertzyKeys = keys.filter(k => k.startsWith('expertzy_'));
      return {
        totalKeys: expertzyKeys.length,
        hasDiData: localStorage.getItem('expertzy_di_data') !== null,
        hasConfig: localStorage.getItem('expertzy_user_config') !== null,
        hasCustos: localStorage.getItem('expertzy_custos_config') !== null
      };
    });
    
    expect(storageData.totalKeys).toBeGreaterThan(0);
    expect(storageData.hasDiData).toBeTruthy();
    expect(storageData.hasConfig).toBeTruthy();
    expect(storageData.hasCustos).toBeTruthy();
  });

  test('Deve recarregar dados salvos após refresh', async () => {
    // Recarregar a página
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verificar se dados foram restaurados
    const diInfo = page.locator('#diInfo');
    await expect(diInfo).toBeVisible();
    
    // Verificar se configurações foram mantidas
    await page.click('[data-tab="custos"]');
    const custosPortuarios = await page.inputValue('#custosPortuarios');
    expect(parseFloat(custosPortuarios)).toBe(1000);
    
    // Capturar screenshot após reload
    await page.screenshot({ path: 'tests/screenshots/09-apos-reload.png' });
  });
});