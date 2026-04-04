const fs = require('fs');

const sstPath = 'd:/manya_app/manya-react/src/engines/sst/SSTFetcherEngine.jsx';
const mathPath = 'd:/manya_app/manya-react/src/engines/math/MathFetcherEngine.jsx';

let sst = fs.readFileSync(sstPath, 'utf8');
const math = fs.readFileSync(mathPath, 'utf8');

// Find the start of the SST return block
const sstStartStr = '        return (\n            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">';
const sstEndStr = '            </div>\n        );\n    } catch (err) {';

const startIndexSST = sst.indexOf(sstStartStr);
const endIndexSST = sst.indexOf(sstEndStr) + sstEndStr.length - '    } catch (err) {'.length;

if (startIndexSST === -1 || endIndexSST === -1) {
    console.error('Failed to find SST block');
    process.exit(1);
}

const targetContent = sst.substring(startIndexSST, endIndexSST);

// Find the start of the Math return block
const mathStart = '        return (\n            <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: \'100%\' }}>';
const mathEnd = '                    </div>,\n                    document.body\n                )\}\n            </div>\n        );\n    } catch (err) {';

const startIndexMath = math.indexOf(mathStart);
const endIndexMath = math.indexOf(mathEnd) + mathEnd.length - '    } catch (err) {'.length;

if (startIndexMath === -1 || endIndexMath === -1) {
    console.error('Failed to find Math block');
    process.exit(1);
}

let newContent = math.substring(startIndexMath, endIndexMath);

// Replace Math specific things: 
// 1. MathSolutionSteps is not available in SST. Replace it with generic p tag for explanation
newContent = newContent.replace('<MathSolutionSteps steps={q.explanation} />', '<p className="text-[var(--text-main)] font-bold text-[14px] leading-relaxed">{q.explanation || \'Detailed concept explanation coming soon.\'}</p>');

// Replace it!
const finalSST = sst.replace(targetContent, newContent);

fs.writeFileSync(sstPath, finalSST);
console.log('Successfully replaced SST UI with Math UI!');
