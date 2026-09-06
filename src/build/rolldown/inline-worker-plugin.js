const fs = require('fs');
const path = require('path');

function inlineWorkerPlugin() {
  return {
    name: 'inline-worker-plugin',
    resolveId(source) {
      if (source.includes('worker-loader') || source.startsWith('worker-loader!')) {
        return '\0inline-worker:extension-worker';
      }
      return null;
    },
    load(id) {
      if (id === '\0inline-worker:extension-worker') {
        let workerCode = '';
        try {
          const workerEntry = path.resolve(__dirname, '../../../node_modules/scratch-vm/src/extension-support/extension-worker.js');
          if (fs.existsSync(workerEntry)) {
            workerCode = fs.readFileSync(workerEntry, 'utf8');
          }
        } catch (e) {
          // ignore
        }

        const code = `
const workerCode = ${JSON.stringify(workerCode)};
export default class InlineWorker {
  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        return new Worker(url);
      } catch (e) {
        console.warn('Could not create inline worker:', e);
      }
    }
  }
}
`;
        return {
          code,
          map: null
        };
      }
      return null;
    }
  };
}

module.exports = inlineWorkerPlugin;
