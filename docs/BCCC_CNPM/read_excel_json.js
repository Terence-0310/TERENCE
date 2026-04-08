const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'TERENCE_TestExecution_HUTECH_Pro.xlsx';
const workbook = xlsx.readFile(filePath);

let result = {};

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    
    let headers = [];
    for(let r = 0; r <= Math.min(2, range.e.r); r++) {
        let temp = [];
        for(let c = range.s.c; c <= range.e.c; ++c) {
            let cell = sheet[xlsx.utils.encode_cell({r, c})];
            temp.push(cell ? cell.v : null);
        }
        if (temp.filter(Boolean).length > 2) {
            headers = temp;
            break;
        }
    }
    
    result[sheetName] = {
        rows: range.e.r + 1,
        headers: headers.map((h, i) => `${i}: ${h}`).filter(h => h && h.indexOf('null') === -1)
    };
});

fs.writeFileSync('excel_structure.json', JSON.stringify(result, null, 2));
console.log('Done writing excel_structure.json');
