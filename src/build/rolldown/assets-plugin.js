const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function assetsPlugin(options = {}) {
  const {
    inlineAll = false,
    audioFull = true,
    isNode = false,
    outDir = 'dist'
  } = options;

  return {
    name: 'rolldown-assets-plugin',
    async resolveId(source, importer) {
      if (source.includes('file-loader') && source.includes('sw.js')) {
        return '\0asset:sw.js';
      }
      return null;
    },
    async load(id) {
      if (id === '\0asset:sw.js') {
        return {
          code: `export default 'sw.js';`,
          map: null
        };
      }

      // Handle mp3
      if (id.endsWith('.mp3')) {
        if (!audioFull) {
          return {
            code: `export default '';`,
            map: null
          };
        }
        const data = await fs.promises.readFile(id);
        const dataUrl = `data:audio/mp3;base64,${data.toString('base64')}`;
        return {
          code: `export default ${JSON.stringify(dataUrl)};`,
          map: null
        };
      }

      // Handle svg & png
      if (id.endsWith('.svg') || id.endsWith('.png')) {
        const data = await fs.promises.readFile(id);
        const ext = path.extname(id).slice(1);
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;

        if (inlineAll) {
          const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`;
          return {
            code: `export default ${JSON.stringify(dataUrl)};`,
            map: null
          };
        }

        if (isNode) {
          // For node build, copy to dist/assets/ and export relative filename
          const hash = crypto.createHash('md5').update(data).digest('hex');
          const basename = path.basename(id, path.extname(id));
          const filename = `assets/${basename}.${hash}.${ext}`;
          const outPath = path.resolve(outDir, filename);
          await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
          await fs.promises.writeFile(outPath, data);
          return {
            code: `module.exports = ${JSON.stringify(filename)};`,
            map: null
          };
        }

        // Web asset
        const hash = crypto.createHash('md5').update(data).digest('hex');
        const basename = path.basename(id, path.extname(id));
        const filename = `assets/${basename}.${hash}.${ext}`;
        const outPath = path.resolve(outDir, filename);
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, data);

        return {
          code: `export default ${JSON.stringify(filename)};`,
          map: null
        };
      }
      return null;
    }
  };
}

module.exports = assetsPlugin;
