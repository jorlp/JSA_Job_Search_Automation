import { readFile } from 'node:fs';

const ExtractedInfo = readFile('C:\\Users\\joris.loupias\\OneDrive\\Documents\\HOMELAB\\Job Search\\JobTitle.txt', 'utf-8', (err, data) => {
    if (err) throw err;
    console.log(data);
});   

export default ExtractedInfo;
