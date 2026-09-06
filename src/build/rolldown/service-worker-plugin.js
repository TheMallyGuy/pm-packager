const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_PAGES = [''];

function serviceWorkerPlugin(options = {}) {
  const {
    swTemplatePath = path.resolve(__dirname, '../../p4/sw.js'),
    outDir = path.resolve(__dirname, '../../../dist'),
    isProduction = process.env.NODE_ENV === 'production'
  } = options;

  return {
    name: 'rolldown-service-worker-plugin',
    async writeBundle(outputOptions, bundle) {
      if (!fs.existsSync(swTemplatePath)) return;

      const allAssetNames = new Set(CACHE_PAGES);
      for (const fileName of Object.keys(bundle)) {
        allAssetNames.add(fileName);
      }

      // Also scan dist/assets if exists
      const assetsDir = path.join(outDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        for (const file of files) {
          allAssetNames.add(`assets/${file}`);
        }
      }

      const assetNames = Array.from(allAssetNames).filter(name => {
        if (name.endsWith('.map')) return false;
        return name.startsWith('assets/') || name.startsWith('js/') || CACHE_PAGES.includes(name);
      });

      const stringifiedAssets = JSON.stringify(assetNames);
      const hash = crypto.createHash('sha256').update(stringifiedAssets).digest('hex');

      let workerSource = await fs.promises.readFile(swTemplatePath, 'utf8');
      workerSource = workerSource
        .replace('__IS_PRODUCTION__', JSON.stringify(isProduction))
        .replace('[/* __ASSETS__ */]', stringifiedAssets)
        .replace('__CACHE_NAME__', JSON.stringify(`p4-${hash}`));

      const swOutPath = path.join(outDir, 'sw.js');
      await fs.promises.writeFile(swOutPath, workerSource, 'utf8');
    }
  };
}

module.exports = serviceWorkerPlugin;
