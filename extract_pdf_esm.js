import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/petrodepot/Energytech Rift Gas Limited Logistics Company Profile.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('c:/Users/Admin/OneDrive/Desktop/petrodepot/pdf_text.txt', data.text);
    console.log("PDF parsed successfully!");
}).catch(function(error){
    console.log(error);
});
