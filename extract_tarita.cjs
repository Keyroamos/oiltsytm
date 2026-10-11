const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

let dataBuffer = fs.readFileSync('TARITA ERP.pdf');

pdfParse(dataBuffer).then(function(data) {
    fs.writeFileSync('tarita_pdf_text.txt', data.text);
    console.log("PDF parsed successfully! Pages:", data.numpages);
}).catch(function(error){
    console.log("Error:", error.message);
});
