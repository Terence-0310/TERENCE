const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'TERENCE_QA_Measurement_Lab_HUTECH.xlsx';
const workbook = xlsx.readFile(filePath);

let result = {};

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet['!ref']) {
        result[sheetName] = { rows: 0, headers: [] };
        return;
    }
    const range = xlsx.utils.decode_range(sheet['!ref']);
    
    let headers = [];
    for(let r = 0; r <= Math.min(5, range.e.r); r++) {
        let temp = [];
        for(let c = range.s.c; c <= range.e.c; ++c) {
            let cell = sheet[xlsx.utils.encode_cell({r, c})];
            temp.push(cell ? cell.v : null);
        }
        if (temp.filter(Boolean).length > 1) {
            headers.push(`Row ${r}: ${temp.map((h, i) => h ? `${i}:${h}` : '').filter(Boolean).join(' | ')}`);
        }
    }
    
    result[sheetName] = {
        rows: range.e.r + 1,
        headers: headers
    };
});

fs.writeFileSync('measurement_structure.json', JSON.stringify(result, null, 2));
