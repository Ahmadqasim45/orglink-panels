const fs = require('fs');
const path = require('path');

const filePath = 'e:/hassan projects/orglink-panels/organsystem/src/utils/appointmentFunctions.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace the pattern for both donor and recipient appointments
const pattern = /if \(!hospitalSnapshot\.empty\) {\s+hospitalName = hospitalSnapshot\.docs\[0\]\.data\(\)\.name \|\| \"Unknown Hospital\";/g;
const replacement = 'if (!hospitalSnapshot.empty) {\n                  const hospitalData = hospitalSnapshot.docs[0].data();\n                  // Fix: Check for both hospitalName and name fields\n                  hospitalName = hospitalData.hospitalName || hospitalData.name || \"Unknown Hospital\";\n                  console.log(\"Retrieved hospital name:\", hospitalName);';

const updatedContent = content.replace(pattern, replacement);

// Write the updated content back to the file
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('Hospital name retrieval fixed in appointmentFunctions.js');
