const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'TERENCE_TestExecution_HUTECH_Pro.xlsx';
const workbook = xlsx.readFile(filePath);

const sheet = workbook.Sheets['01_Login'];
const range = xlsx.utils.decode_range(sheet['!ref']);

let output = [];
for(let r = 0; r <= 30; r++) {
    let rowValues = [];
    for(let c = range.s.c; c <= range.e.c; ++c) {
        let cell = sheet[xlsx.utils.encode_cell({r, c})];
        rowValues.push(cell ? cell.v : null);
    }
    if (rowValues.some(v => v !== null)) {
        output.push(`Row ${r}: ${JSON.stringify(rowValues)}`);
    }
}
fs.writeFileSync('debug.txt', output.join('\n'));
