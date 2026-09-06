const fs = require('fs');
const path = require('path');

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function cssModulesPlugin() {
  return {
    name: 'scaffolding-css-modules',
    async load(id) {
      // Handle raw-loader query e.g. !raw-loader!./style.css or ?raw
      if (id.includes('raw-loader') || id.endsWith('?raw')) {
        const cleanPath = id.replace(/^.*!/, '').replace(/\?raw$/, '');
        const content = await fs.promises.readFile(cleanPath, 'utf8');
        return {
          code: `export default ${JSON.stringify(content)};`,
          moduleType: 'js',
          map: null
        };
      }

      // Handle scaffolding style.css
      if (id.endsWith('src/scaffolding/style.css') || id.endsWith('src\\scaffolding\\style.css')) {
        let css = await fs.promises.readFile(id, 'utf8');

        // Inline check.svg as base64 data URL
        const checkSvgPath = path.resolve(path.dirname(id), 'check.svg');
        if (fs.existsSync(checkSvgPath)) {
          const svgContent = fs.readFileSync(checkSvgPath, 'utf8');
          const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
          css = css.replace(/url\(\s*check\.svg\s*\)/g, `url("${svgDataUrl}")`);
        }

        // Extract class names and transform to sc-[local]
        const classNames = new Set();
        const classRegex = /\.([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = classRegex.exec(css)) !== null) {
          const className = match[1];
          // avoid matching numbers like .5rem
          if (/^[a-zA-Z_-]/.test(className)) {
            classNames.add(className);
          }
        }

        // Replace all class selectors: .class-name -> .sc-class-name
        // Sort by longest first to avoid substring replacement collision
        const sortedClasses = Array.from(classNames).sort((a, b) => b.length - a.length);
        for (const cls of sortedClasses) {
          const regex = new RegExp(`\\.${cls}(?=[^a-zA-Z0-9_-]|$)`, 'g');
          css = css.replace(regex, `.sc-${cls}`);
        }

        const exportsMap = {};
        for (const cls of classNames) {
          exportsMap[toCamelCase(cls)] = `sc-${cls}`;
          // Also keep exact match if needed
          exportsMap[cls] = `sc-${cls}`;
        }

        const code = `
const css = ${JSON.stringify(css)};
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = css;
  const el = document.head || document.body || document.documentElement;
  if (el) {
    el.insertBefore(styleElement, el.firstChild);
  }
}
const styles = ${JSON.stringify(exportsMap)};
export default styles;
`;
        return {
          code,
          moduleType: 'js',
          map: null
        };
      }

      // Other .css imports
      if (id.endsWith('.css')) {
        const css = await fs.promises.readFile(id, 'utf8');
        const code = `
const css = ${JSON.stringify(css)};
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}
export default css;
`;
        return {
          code,
          moduleType: 'js',
          map: null
        };
      }
    }
  };
}

module.exports = cssModulesPlugin;
