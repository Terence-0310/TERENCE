const xlsx = require('xlsx');

const filePath = 'TERENCE_TestExecution_HUTECH_Pro.xlsx';
const workbook = xlsx.readFile(filePath);

console.log("Sheets: ", workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // get range
    const range = xlsx.utils.decode_range(sheet['!ref']);
    console.log(`\n--- ${sheetName} ---`);
    console.log(`Rows: ${range.e.r + 1}`);
    
    // Read first row
    let headers = [];
    for(let c = range.s.c; c <= range.e.c; ++c) {
        let cell = sheet[xlsx.utils.encode_cell({r: 0, c: c})];
        headers.push(cell ? cell.v : null);
    }
    
    // If row 0 is empty, try row 1
    if (headers.filter(h => h).length < 2) {
       headers = [];
       for(let c = range.s.c; c <= range.e.c; ++c) {
          let cell = sheet[xlsx.utils.encode_cell({r: 1, c: c})];
          headers.push(cell ? cell.v : null);
       }
    }
    console.log("Headers:", headers.map((h, i) => `${i+1}: ${h}`).filter(h => !h.includes('null')));
});
