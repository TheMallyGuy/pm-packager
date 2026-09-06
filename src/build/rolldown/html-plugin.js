const fs = require('fs');
const path = require('path');
const brand = require('../../packager/brand.js');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function htmlPlugin(options = {}) {
  const {
    templatePath = path.resolve(__dirname, '../../p4/template.ejs'),
    staticDir = path.resolve(__dirname, '../../../static'),
    outDir = path.resolve(__dirname, '../../../dist')
  } = options;

  return {
    name: 'rolldown-html-plugin',
    async writeBundle(outputOptions, bundle) {
      // 1. Copy static files
      copyDirSync(staticDir, outDir);

      // 2. Find p4 JS chunk
      let p4ChunkName = 'js/p4.js';
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && (chunk.name === 'p4' || fileName.includes('p4'))) {
          p4ChunkName = fileName;
          break;
        }
      }

      // 3. Render template.ejs
      let template = await fs.promises.readFile(templatePath, 'utf8');
      
      // Simple EJS replacement for template.ejs
      template = template.replace(/<%\s*const\s*\{\s*APP_NAME\s*\}\s*=\s*require\([^)]+\);\s*%>/g, '');
      template = template.replace(/<%=\s*APP_NAME\s*%>/g, brand.APP_NAME || 'PenguinMod Packager');

      // Inject script
      const scriptTag = `<script src="${p4ChunkName}"></script>`;
      template = template.replace('</body>', `  ${scriptTag}\n  </body>`);

      // Write index.html
      const indexPath = path.join(outDir, 'index.html');
      await fs.promises.writeFile(indexPath, template, 'utf8');
    }
  };
}

module.exports = htmlPlugin;
