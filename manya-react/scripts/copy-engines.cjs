const fs = require('fs');
const path = require('path');

const srcFile = path.resolve(__dirname, '../src/engines/sst/SSTFetcherEngine.jsx');
let content = fs.readFileSync(srcFile, 'utf8');

let mathContent = content
  .replace(/fetchSstQuestions/g, 'fetchMathQuestions')
  .replace(/sstMockDB/g, 'mathMockDB')
  .replace(/SSTFetcherEngine/g, 'MathFetcherEngine')
  .replace(/SST\s*Engine/g, 'MathEngine')
  .replace(/subject: 'sst'/g, "subject: 'math'")
  .replace(/subject = data\?\.subject \|\| 'sst'/g, "subject = data?.subject || 'math'")
  .replace(/`sst\/\$\{topicId\}`/g, "`math/${topicId}`")
  .replace(/questions_sst/g, 'questions_math')
  .replace(/\[SST\]/g, '[Math]')
  .replace(/adaptive_sst/g, 'adaptive_math');

fs.writeFileSync(path.resolve(__dirname, '../src/engines/math/MathFetcherEngine.jsx'), mathContent);

let scienceContent = content
  .replace(/fetchSstQuestions/g, 'fetchScienceQuestions')
  .replace(/sstMockDB/g, 'scienceMockDB')
  .replace(/SSTFetcherEngine/g, 'ScienceFetcherEngine')
  .replace(/SST\s*Engine/g, 'ScienceEngine')
  .replace(/subject: 'sst'/g, "subject: 'science'")
  .replace(/subject = data\?\.subject \|\| 'sst'/g, "subject = data?.subject || 'science'")
  .replace(/`sst\/\$\{topicId\}`/g, "`science/${topicId}`")
  .replace(/questions_sst/g, 'questions_science')
  .replace(/\[SST\]/g, '[Science]')
  .replace(/adaptive_sst/g, 'adaptive_science');

fs.writeFileSync(path.resolve(__dirname, '../src/engines/science/ScienceFetcherEngine.jsx'), scienceContent);

console.log('Math and Science Fetcher Engines created successfully!');
