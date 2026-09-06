const path = require('path');
const svelte = require('rollup-plugin-svelte');
const replace = require('@rollup/plugin-replace');

const cssModulesPlugin = require('./src/build/rolldown/css-modules-plugin');
const inlineWorkerPlugin = require('./src/build/rolldown/inline-worker-plugin');
const assetsPlugin = require('./src/build/rolldown/assets-plugin');
const htmlPlugin = require('./src/build/rolldown/html-plugin');
const serviceWorkerPlugin = require('./src/build/rolldown/service-worker-plugin');
const loadersPlugin = require('./src/build/rolldown/loaders-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isStandalone = Boolean(process.env.STANDALONE);
const isNodeMode = process.env.BUILD_MODE === 'node';
const dist = path.resolve(__dirname, 'dist');

const buildId = isProduction ? require('./src/build/generate-scaffolding-build-id') : null;

const getVersion = () => {
  if (process.env.VERSION) {
    return process.env.VERSION;
  }
  if (isStandalone) {
    const now = new Date();
    const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const packageJSON = require('./package.json');
    const version = packageJSON.version;
    return `Standalone v${version} (${dateString})`;
  }
  return null;
};
const version = getVersion();

const commonResolve = {
  extensions: ['.mjs', '.js', '.jsx', '.json', '.svelte'],
  alias: {
    'text-encoding': path.resolve(__dirname, 'src', 'scaffolding', 'text-encoding', 'index.js'),
    'htmlparser2': path.resolve(__dirname, 'src', 'scaffolding', 'htmlparser2', 'index.js'),
    'scratch-translate-extension-languages': path.resolve(__dirname, 'src', 'scaffolding', 'scratch-translate-extension-languages', 'languages.json'),
    'scratch-parser': path.resolve(__dirname, 'src', 'scaffolding', 'scratch-parser', 'index.js'),
    'svelte': path.resolve(__dirname, 'node_modules', 'svelte'),
    'pngjs': path.resolve(__dirname, 'node_modules', 'pngjs', 'browser.js'),
    'fs': path.resolve(__dirname, 'src', 'build', 'rolldown', 'empty-module.js'),
    'vm': path.resolve(__dirname, 'src', 'build', 'rolldown', 'empty-module.js')
  }
};

const makeScaffoldingEntry = ({ name, inputPath, isFullAudio = false }) => ({
  input: {
    [`scaffolding/${name}`]: inputPath
  },
  output: {
    dir: dist,
    entryFileNames: '[name].js',
    format: 'iife',
    codeSplitting: false,
    sourcemap: !isProduction,
    banner: buildId ? `\n// ${buildId} =^..^=` : undefined
  },
  resolve: commonResolve,
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      }
    }),
    loadersPlugin(),
    inlineWorkerPlugin(),
    cssModulesPlugin(),
    assetsPlugin({
      inlineAll: true,
      audioFull: isFullAudio,
      outDir: dist
    })
  ]
});

const makeWebsite = () => ({
  input: {
    'js/p4': path.resolve(__dirname, 'src/p4/index.js')
  },
  output: {
    dir: dist,
    entryFileNames: '[name].js',
    format: 'iife',
    codeSplitting: false,
    sourcemap: !isStandalone
  },
  resolve: commonResolve,
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.ENABLE_SERVICE_WORKER': JSON.stringify(process.env.ENABLE_SERVICE_WORKER || false),
        'process.env.STANDALONE': JSON.stringify(isStandalone),
        'process.env.VERSION': JSON.stringify(version),
        'process.env.PLAUSIBLE_API': JSON.stringify(process.env.PLAUSIBLE_API || ''),
        'process.env.PLAUSIBLE_DOMAIN': JSON.stringify(process.env.PLAUSIBLE_DOMAIN || ''),
        'process.env.SCAFFOLDING_BUILD_ID': JSON.stringify(buildId || `development-${Math.random().toString().substring(2)}`),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      }
    }),
    loadersPlugin(),
    svelte({
      emitCss: false,
      compilerOptions: {
        dev: !isProduction
      }
    }),
    cssModulesPlugin(),
    assetsPlugin({
      inlineAll: isStandalone,
      outDir: dist
    }),
    htmlPlugin({
      outDir: dist
    }),
    serviceWorkerPlugin({
      outDir: dist,
      isProduction
    })
  ]
});

const makeNode = () => ({
  input: {
    packager: path.resolve(__dirname, 'src/packager/node/export.js')
  },
  output: {
    dir: dist,
    entryFileNames: '[name].js',
    format: 'cjs',
    codeSplitting: false,
    sourcemap: false
  },
  external: [
    'jszip',
    'cross-fetch',
    'sha.js',
    '@fiahfy/icns',
    '@turbowarp/sbdl',
    'fs',
    'path',
    'util',
    'crypto',
    'events',
    'stream',
    'buffer',
    'os',
    'http',
    'https',
    'url',
    'zlib'
  ],
  resolve: {
    ...commonResolve,
    alias: {
      ...commonResolve.alias,
      'pngjs': 'pngjs',
      'fs': 'fs',
      'vm': 'vm'
    }
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.SCAFFOLDING_BUILD_ID': JSON.stringify(buildId || 'development-node'),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      }
    }),
    loadersPlugin(),
    assetsPlugin({
      isNode: true,
      outDir: dist
    })
  ]
});

const configs = isNodeMode ? [
  makeNode()
] : [
  makeScaffoldingEntry({ name: 'scaffolding-full', inputPath: path.resolve(__dirname, 'src/scaffolding/export.js'), isFullAudio: true }),
  makeScaffoldingEntry({ name: 'scaffolding-min', inputPath: path.resolve(__dirname, 'src/scaffolding/export.js'), isFullAudio: false }),
  makeScaffoldingEntry({ name: 'addons', inputPath: path.resolve(__dirname, 'src/addons/index.js'), isFullAudio: true }),
  makeWebsite()
];

module.exports = configs;
