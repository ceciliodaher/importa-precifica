# Plano de Desenvolvimento - Sistema Expertzy de Importação e Precificação

## 📊 STATUS GERAL DO PROJETO
**Progresso Total: 5%**  
**Início:** 17/08/2025  
**Prazo:** 19/08/2025 (2 dias)  
**Status:** 🔄 Em desenvolvimento

---

## 🏗️ ESTRUTURA DO PROJETO

### Arquitetura de Arquivos
```
/sistema-expertzy-local/
├── index.html                    # Landing page Expertzy ⏳
├── sistema-importacao.html       # Sistema principal ⏳
├── PLANO-DESENVOLVIMENTO.md      # Este documento ✅
├── /css/
│   ├── landing.css              # Estilos da landing page ⏳
│   └── sistema.css              # Estilos do sistema ⏳
├── /js/
│   ├── app.js                   # Aplicação principal ⏳
│   ├── xmlParser.js             # Parser do XML da DI ⏳
│   ├── calculator.js            # Cálculos tributários ⏳
│   ├── pricing.js               # Engine de precificação ⏳
│   └── storage.js               # Gerenciamento localStorage ⏳
├── /data/
│   ├── aliquotas.json           # Base de alíquotas 2025 ⏳
│   ├── beneficios.json          # Benefícios fiscais ⏳
│   └── config.json              # Configurações do sistema ⏳
├── /assets/
│   └── /images/                 # Logos Expertzy ✅
└── /samples/
    └── 2300120746.xml           # XML de teste ✅
```

---

## 📅 DIA 1 - ESTRUTURA E PROCESSAMENTO

### 🌅 MANHÃ (8h-12h)

#### 1. Estrutura Base do Projeto
- [x] Criar estrutura de pastas
- [x] Copiar logos Expertzy para /assets/images/
- [x] Copiar XML de teste para /samples/
- [x] Criar PLANO-DESENVOLVIMENTO.md
**Status:** ✅ CONCLUÍDO

#### 2. Landing Page (index.html)
- [ ] Estrutura HTML5 com Bootstrap 4
- [ ] Header com logo Expertzy
- [ ] Seção Hero com CTA
- [ ] Seção de Funcionalidades
- [ ] Seção de Benefícios
- [ ] Footer com contato
- [ ] Estilização com cores Expertzy (#FF002D, #091A30)
**Status:** ⏳ PENDENTE

#### 3. Sistema Principal (sistema-importacao.html)
- [ ] Layout com sidebar de navegação
- [ ] Área de upload de XML
- [ ] Tabela de resultados
- [ ] Formulários de configuração
- [ ] Dashboard de resumo
**Status:** ⏳ PENDENTE

#### 4. Parser XML (xmlParser.js)
- [ ] Classe DiParser
- [ ] Método parseXML()
- [ ] Extração de dados gerais
- [ ] Processamento de adições
- [ ] Extração de produtos
- [ ] Parsing de informações complementares
**Status:** ⏳ PENDENTE

### 🌆 TARDE (13h-17h)

#### 5. JSONs de Configuração
- [ ] aliquotas.json com dados 2025
- [ ] beneficios.json (GO, SC, MG, ES)
- [ ] config.json
**Status:** ⏳ PENDENTE

#### 6. Calculadora Tributária (calculator.js)
- [ ] Classe TributaryCalculator
- [ ] Cálculo de II
- [ ] Cálculo de IPI
- [ ] Cálculo de PIS/COFINS
- [ ] Cálculo de ICMS
- [ ] Aplicação de benefícios
**Status:** ⏳ PENDENTE

#### 7. Interface de Upload
- [ ] Drag-and-drop
- [ ] Validação de arquivo
- [ ] Feedback visual
- [ ] Exibição de dados
**Status:** ⏳ PENDENTE

#### 8. Armazenamento Local (storage.js)
- [ ] Classe DataStorage
- [ ] Salvar DI
- [ ] Carregar DI
- [ ] Listar DIs
- [ ] Exportar/Importar JSON
**Status:** ⏳ PENDENTE

---

## 📅 DIA 2 - INTERFACE E FUNCIONALIDADES

### 🌅 MANHÃ (8h-12h)

#### 9. Interface de Resultados
- [ ] Tabela expansível multi-nível
- [ ] Campos editáveis
- [ ] Dashboard com totais
- [ ] Visualização detalhada
**Status:** ⏳ PENDENTE

#### 10. Módulo de Precificação (pricing.js)
- [ ] Classe PricingEngine
- [ ] Cálculo de preços
- [ ] Comparação entre estados
- [ ] Simulação de cenários
**Status:** ⏳ PENDENTE

#### 11. Configuração de Custos Extras
- [ ] Interface de custos
- [ ] Rateio proporcional
- [ ] Templates salvos
**Status:** ⏳ PENDENTE

### 🌆 TARDE (13h-17h)

#### 12. Exportações
- [ ] Excel (SheetJS)
- [ ] PDF (jsPDF)
- [ ] JSON estruturado
**Status:** ⏳ PENDENTE

#### 13. Testes com XML Real
- [ ] Carregar 2300120746.xml
- [ ] Validar extração
- [ ] Verificar cálculos
- [ ] Testar precificação
**Status:** ⏳ PENDENTE

#### 14. Ajustes Finais
- [ ] Responsividade
- [ ] Mensagens de erro
- [ ] Loading states
- [ ] Documentação
**Status:** ⏳ PENDENTE

---

## 🔑 NOMENCLATURAS PADRONIZADAS

### Classes JavaScript
- `DiParser` - Parser de XML da DI
- `TributaryCalculator` - Calculadora de tributos
- `PricingEngine` - Motor de precificação
- `DataStorage` - Gerenciamento de armazenamento

### Estrutura de Dados (seguindo documentação)
```javascript
{
  numero_di: "2300120746",
  data_registro: "2023-01-02",
  urf_despacho_codigo: "0120100",
  urf_despacho_nome: "GOIANIA",
  importador: {
    nome: "...",
    cnpj: "...",
    endereco: "..."
  },
  adicoes: [{
    numero_adicao: "001",
    ncm: "73181500",
    produtos: [...],
    tributos: {
      ii_valor: 0,
      ipi_valor: 0,
      pis_valor: 0,
      cofins_valor: 0,
      icms_valor: 0
    }
  }]
}
```

---

## 📝 NOTAS DE DESENVOLVIMENTO

### Última Atualização
**Data/Hora:** 17/08/2025 - Início do projeto  
**Ação:** Criada estrutura base e documentação

### Próximos Passos Imediatos
1. Criar landing page com identidade Expertzy
2. Desenvolver parser XML funcional
3. Implementar cálculos tributários básicos

### Observações Importantes
- Sistema 100% frontend (HTML/JS)
- Dados em localStorage/JSON
- Preparado para futura migração PHP
- Foco em funcionalidade sobre estética

---

## ✅ CHECKLIST DE ENTREGA

### Dia 1
- [x] Estrutura de pastas criada
- [ ] Landing page funcional
- [ ] Parser XML operacional
- [ ] Cálculos básicos funcionando

### Dia 2
- [ ] Interface completa
- [ ] Precificação implementada
- [ ] Exportações funcionando
- [ ] Sistema testado com XML real

---

## 📊 MÉTRICAS

- **Arquivos criados:** 3/20
- **Funcionalidades implementadas:** 0/14
- **Testes realizados:** 0/5
- **Bugs conhecidos:** 0

---

**Responsável:** Sistema Expertzy  
**Versão:** 0.0.1  
**Ambiente:** Local (navegador)