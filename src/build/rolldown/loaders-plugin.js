const fs = require('fs');
const path = require('path');
const unstructureLoader = require('../unstructure-translations-loader');

function loadersPlugin() {
  return {
    name: 'loaders-plugin',
    resolveId(source, importer) {
      if (source.includes('unstructure-translations-loader')) {
        const filePath = source.replace(/^.*!/, '');
        const resolvedPath = importer ? path.resolve(path.dirname(importer), filePath) : path.resolve(filePath);
        return `\0unstructure:${resolvedPath}`;
      }
      if (source.includes('tw-load-script-as-plain-text')) {
        const filePath = source.replace(/^.*!/, '');
        const resolvedPath = importer ? path.resolve(path.dirname(importer), filePath) : path.resolve(filePath);
        return `\0plain-text:${resolvedPath}`;
      }
      if (source.includes('base64-loader')) {
        const filePath = source.replace(/^.*!/, '');
        const resolvedPath = importer ? path.resolve(path.dirname(importer), filePath) : path.resolve(filePath);
        return `\0base64:${resolvedPath}`;
      }
      if (source.includes('arraybuffer-loader')) {
        const filePath = source.replace(/^.*!/, '');
        const resolvedPath = importer ? path.resolve(path.dirname(importer), filePath) : path.resolve(filePath);
        return `\0arraybuffer:${resolvedPath}`;
      }
      if (source.includes('ify-loader')) {
        const moduleName = source.replace(/^.*!/, '');
        return this.resolve(moduleName, importer);
      }
      if (source.includes('raw-loader')) {
        const filePath = source.replace(/^.*!/, '');
        const resolvedPath = importer ? path.resolve(path.dirname(importer), filePath) : path.resolve(filePath);
        return `\0raw:${resolvedPath}`;
      }
      return null;
    },
    async load(id) {
      if (id.startsWith('\0unstructure:')) {
        const filePath = id.replace('\0unstructure:', '');
        const content = await fs.promises.readFile(filePath, 'utf8');
        const unstructured = unstructureLoader(content);
        return {
          code: `export default ${unstructured};`,
          moduleType: 'js',
          map: null
        };
      }
      if (id.startsWith('\0plain-text:')) {
        let filePath = id.replace('\0plain-text:', '');
        if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.js`)) {
          filePath = `${filePath}.js`;
        }
        const content = await fs.promises.readFile(filePath, 'utf8');
        return {
          code: `module.exports = ${JSON.stringify(content)};`,
          moduleType: 'js',
          map: null
        };
      }
      if (id.startsWith('\0base64:')) {
        const filePath = id.replace('\0base64:', '');
        const buffer = await fs.promises.readFile(filePath);
        return {
          code: `module.exports = ${JSON.stringify(buffer.toString('base64'))};`,
          moduleType: 'js',
          map: null
        };
      }
      if (id.startsWith('\0arraybuffer:')) {
        const filePath = id.replace('\0arraybuffer:', '');
        const buffer = await fs.promises.readFile(filePath);
        const base64 = buffer.toString('base64');
        const code = `
const base64 = ${JSON.stringify(base64)};
const binary = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}
module.exports = bytes.buffer;
`;
        return {
          code,
          moduleType: 'js',
          map: null
        };
      }
      if (id.startsWith('\0raw:')) {
        const filePath = id.replace('\0raw:', '');
        const content = await fs.promises.readFile(filePath, 'utf8');
        return {
          code: `export default ${JSON.stringify(content)};`,
          moduleType: 'js',
          map: null
        };
      }
      return null;
    },
    transform(code, id) {
      if (id.includes('cannon.min.js')) {
        // Fix duplicate var declaration inside module block
        return {
          code: code.replace('{var n=e("./Shape");', '{n=e("./Shape");'),
          moduleType: 'js',
          map: null
        };
      }
      return null;
    }
  };
}

module.exports = loadersPlugin;
