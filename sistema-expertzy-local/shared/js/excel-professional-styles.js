/**
 * Excel Professional Styles - Formatação Corporativa Expertzy
 * Sistema de estilos profissionais extraído do importa-di-venda
 * Cores corporativas, formatação condicional e zebra striping
 */

class ExcelProfessionalStyles {
    constructor() {
        // Estilos corporativos Expertzy para Excel
        this.estilosExpertzy = {
            // Cores corporativas
            cores: {
                vermelhoExpertzy: 'FFFF002D',      // #FF002D
                azulNaval: 'FF091A30',             // #091A30
                branco: 'FFFFFFFF',                // #FFFFFF
                azulCorporativo: 'FF4285F4',       // Headers padrão
                verdeClaro: 'FFE8F5E8',            // Aprovado/OK
                amareloClaro: 'FFFFF3CD',          // Aviso
                vermelhoClaro: 'FFFFEAEA',         // Erro
                cinzaClaro: 'FFF5F5F5',            // Alternância zebra
                azulClaro: 'FFE3F2FD'              // Informativo
            },
            
            // Estilos de header
            headerPrincipal: {
                fill: { fgColor: { rgb: 'FF091A30' } },  // Azul naval
                font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 14 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                    top: { style: 'medium', color: { rgb: 'FF000000' } },
                    bottom: { style: 'medium', color: { rgb: 'FF000000' } },
                    left: { style: 'medium', color: { rgb: 'FF000000' } },
                    right: { style: 'medium', color: { rgb: 'FF000000' } }
                }
            },
            
            headerSecundario: {
                fill: { fgColor: { rgb: 'FF4285F4' } },  // Azul corporativo
                font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 12 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'FF000000' } },
                    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                    left: { style: 'thin', color: { rgb: 'FF000000' } },
                    right: { style: 'thin', color: { rgb: 'FF000000' } }
                }
            },
            
            // Estilos de dados
            valorMonetario: {
                numFmt: '"R$ "#,##0.00_);[Red]("R$ "#,##0.00)',
                alignment: { horizontal: 'right', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
                }
            },
            
            valorPercentual: {
                numFmt: '0.00%',
                alignment: { horizontal: 'right', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
                }
            },
            
            textoNormal: {
                alignment: { horizontal: 'left', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
                }
            },
            
            ncmMonospace: {
                font: { name: 'Courier New', sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
                }
            },
            
            // Estilos de validação com formatação condicional
            validacaoOK: {
                fill: { fgColor: { rgb: 'FFE8F5E8' } },  // Verde claro
                font: { color: { rgb: 'FF2E7D32' }, bold: true },
                border: {
                    top: { style: 'thin', color: { rgb: 'FF4CAF50' } },
                    bottom: { style: 'thin', color: { rgb: 'FF4CAF50' } },
                    left: { style: 'thin', color: { rgb: 'FF4CAF50' } },
                    right: { style: 'thin', color: { rgb: 'FF4CAF50' } }
                }
            },
            
            validacaoAviso: {
                fill: { fgColor: { rgb: 'FFFFF8E1' } },  // Amarelo claro
                font: { color: { rgb: 'FFF57F17' }, bold: true },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFFFC107' } },
                    bottom: { style: 'thin', color: { rgb: 'FFFFC107' } },
                    left: { style: 'thin', color: { rgb: 'FFFFC107' } },
                    right: { style: 'thin', color: { rgb: 'FFFFC107' } }
                }
            },
            
            validacaoErro: {
                fill: { fgColor: { rgb: 'FFFFEBEE' } },  // Vermelho claro
                font: { color: { rgb: 'FFC62828' }, bold: true },
                border: {
                    top: { style: 'thin', color: { rgb: 'FFF44336' } },
                    bottom: { style: 'thin', color: { rgb: 'FFF44336' } },
                    left: { style: 'thin', color: { rgb: 'FFF44336' } },
                    right: { style: 'thin', color: { rgb: 'FFF44336' } }
                }
            },
            
            // Estilos para totais e subtotais
            subtotal: {
                fill: { fgColor: { rgb: 'FFE3F2FD' } },  // Azul claro
                font: { bold: true, sz: 11 },
                border: {
                    top: { style: 'medium', color: { rgb: 'FF1976D2' } },
                    bottom: { style: 'thin', color: { rgb: 'FF1976D2' } },
                    left: { style: 'thin', color: { rgb: 'FF1976D2' } },
                    right: { style: 'thin', color: { rgb: 'FF1976D2' } }
                }
            },
            
            total: {
                fill: { fgColor: { rgb: 'FF091A30' } },  // Azul naval
                font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 12 },
                border: {
                    top: { style: 'medium', color: { rgb: 'FF000000' } },
                    bottom: { style: 'medium', color: { rgb: 'FF000000' } },
                    left: { style: 'medium', color: { rgb: 'FF000000' } },
                    right: { style: 'medium', color: { rgb: 'FF000000' } }
                }
            },
            
            // Zebra striping para tabelas
            linhaAlternada: {
                fill: { fgColor: { rgb: 'FFF5F5F5' } },  // Cinza bem claro
                border: {
                    top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'FFD0D0D0' } }
                }
            }
        };
    }
    
    /**
     * Aplicar formatação de header principal
     */
    applyHeaderStyle(ws, cellRange) {
        const range = XLSX.utils.decode_range(cellRange);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = this.estilosExpertzy.headerPrincipal;
                }
            }
        }
    }
    
    /**
     * Aplicar formatação de header secundário
     */
    applySecondaryHeaderStyle(ws, cellRange) {
        const range = XLSX.utils.decode_range(cellRange);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = this.estilosExpertzy.headerSecundario;
                }
            }
        }
    }
    
    /**
     * Aplicar zebra striping para tabelas
     */
    applyZebraStriping(ws, startRow, endRow, startCol, endCol) {
        for (let R = startRow; R <= endRow; R++) {
            const isZebra = (R % 2) === 0;
            for (let C = startCol; C <= endCol; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    const baseStyle = ws[cellAddress].s || {};
                    if (isZebra) {
                        ws[cellAddress].s = {
                            ...baseStyle,
                            fill: { fgColor: { rgb: this.estilosExpertzy.cores.cinzaClaro } }
                        };
                    }
                }
            }
        }
    }
    
    /**
     * Aplicar formatação monetária brasileira
     */
    applyCurrencyStyle(ws, cellRange) {
        const range = XLSX.utils.decode_range(cellRange);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {
                        ...ws[cellAddress].s,
                        ...this.estilosExpertzy.valorMonetario
                    };
                }
            }
        }
    }
    
    /**
     * Aplicar formatação de percentual
     */
    applyPercentageStyle(ws, cellRange) {
        const range = XLSX.utils.decode_range(cellRange);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = {
                        ...ws[cellAddress].s,
                        ...this.estilosExpertzy.valorPercentual
                    };
                }
            }
        }
    }
    
    /**
     * Aplicar formatação de validação (OK, Aviso, Erro)
     */
    applyValidationStyle(ws, cellAddress, status) {
        if (!ws[cellAddress]) return;
        
        let style;
        switch (status.toLowerCase()) {
            case 'ok':
            case 'aprovado':
                style = this.estilosExpertzy.validacaoOK;
                break;
            case 'aviso':
            case 'warning':
                style = this.estilosExpertzy.validacaoAviso;
                break;
            case 'erro':
            case 'error':
                style = this.estilosExpertzy.validacaoErro;
                break;
            default:
                style = this.estilosExpertzy.textoNormal;
        }
        
        ws[cellAddress].s = style;
    }
    
    /**
     * Aplicar formatação de NCM com fonte monospace
     */
    applyNCMStyle(ws, cellRange) {
        const range = XLSX.utils.decode_range(cellRange);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = this.estilosExpertzy.ncmMonospace;
                }
            }
        }
    }
    
    /**
     * Configurar larguras de coluna otimizadas
     */
    setOptimizedColumnWidths(ws, columnConfigs) {
        ws['!cols'] = columnConfigs.map(config => ({ wch: config }));
    }
    
    /**
     * Configurar auto-filter
     */
    setAutoFilter(ws, range) {
        ws['!autofilter'] = { ref: range };
    }
}

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelProfessionalStyles;
}