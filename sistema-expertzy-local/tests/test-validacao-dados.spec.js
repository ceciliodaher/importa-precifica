// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Validação de Dados da DI', () => {
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

  test('Deve identificar incoterm CFR corretamente', async () => {
    // Navegar para o sistema
    await page.goto('http://localhost:8080/sistema-importacao.html');
    
    // Carregar arquivo de exemplo usando a função global
    await page.evaluate(() => {
      window.loadSample();
    });
    
    // Aguardar processamento
    await page.waitForTimeout(3000);
    
    // Verificar se incoterm CFR foi identificado
    const diInfo = await page.textContent('#diInfo');
    expect(diInfo).toContain('CFR');
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/validacao-incoterm.png' });
  });

  test('Deve extrair adições corretamente', async () => {
    // Navegar para aba de dados
    await page.click('[data-tab="dados"]');
    await page.waitForTimeout(1000);
    
    // Verificar se tabela de adições existe e tem dados
    const tabelaAdicoes = page.locator('#adicoesTable tbody tr');
    const count = await tabelaAdicoes.count();
    expect(count).toBeGreaterThan(0);
    
    // Verificar se primeira linha tem NCM correto (73181500 do XML)
    const primeiraLinha = tabelaAdicoes.first();
    const ncmCell = await primeiraLinha.locator('td:nth-child(2)').textContent();
    expect(ncmCell).toContain('73181500');
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/validacao-adicoes.png' });
  });

  test('Deve mostrar dados do importador', async () => {
    // Verificar se informações do importador estão visíveis
    const importadorInfo = page.locator('#importadorInfo');
    await expect(importadorInfo).toBeVisible();
    
    // Verificar se há conteúdo
    const content = await importadorInfo.textContent();
    expect(content).toBeTruthy();
    expect(content.trim().length).toBeGreaterThan(0);
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/validacao-importador.png' });
  });

  test('Deve calcular totais da DI', async () => {
    // Verificar se totais estão visíveis
    const totalsInfo = page.locator('#totalsInfo');
    await expect(totalsInfo).toBeVisible();
    
    // Verificar se há cards com valores
    const cards = page.locator('#totalsInfo .card');
    const cardsCount = await cards.count();
    expect(cardsCount).toBeGreaterThan(0);
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/validacao-totais.png' });
  });

  test('Deve habilitar aba de custos após processamento', async () => {
    // Verificar se aba de custos foi habilitada
    const custosTab = page.locator('[data-tab="custos"]');
    await expect(custosTab).not.toHaveClass(/disabled/);
    
    // Tentar navegar para aba de custos
    await page.click('[data-tab="custos"]');
    await page.waitForTimeout(1000);
    
    // Verificar se interface de custos está visível
    const custosInterface = page.locator('#custosInterface');
    await expect(custosInterface).toBeVisible();
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/validacao-custos.png' });
  });
});