const fs = require('fs');
const path = require('path');

function htmlToJsx(html) {
  return html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    // Self close img
    .replace(/<img([^>]+[^\/])>/g, '<img$1 />')
    // Self close input
    .replace(/<input([^>]+[^\/])>/g, '<input$1 />')
    // Self close meta
    .replace(/<meta([^>]+[^\/])>/g, '<meta$1 />')
    // Self close link
    .replace(/<link([^>]+[^\/])>/g, '<link$1 />')
    // Self close hr
    .replace(/<hr([^>]+[^\/])>/g, '<hr$1 />')
    // Fix inline styles - just extremely basic fix for known styles, or we can just remove them for now.
    // Actually, inline styles like `style="color:#fff;"` need to be `style={{color: '#fff'}}`.
    // It's safer to just replace specific known inline styles since there aren't too many.
    .replace(/style="([^"]*)"/g, (match, p1) => {
      const rules = p1.split(';').filter(Boolean);
      const styleObj = rules.map(rule => {
        const [key, value] = rule.split(':').map(s => s.trim());
        if (!key || !value) return '';
        // camelCase key
        const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
        return `"${camelKey}": "${value}"`;
      }).filter(Boolean).join(', ');
      return `style={{${styleObj}}}`;
    })
    // Fix comments
    .replace(/<!--(.*?)-->/gs, '{/* $1 */}');
}

function processFile(inputFile, outputFolder, componentName) {
  if (!fs.existsSync(inputFile)) return;
  const html = fs.readFileSync(inputFile, 'utf-8');
  
  // Extract body content inside <div class="page-shell"> to use as page content
  // Or just take the whole <main> part.
  const mainMatch = html.match(/<main>(.*?)<\/main>/s);
  const mainContent = mainMatch ? mainMatch[1] : '';
  
  const jsxMain = htmlToJsx(mainContent);
  
  const jsxFile = `export default function ${componentName}() {
  return (
    <main>
      ${jsxMain}
    </main>
  );
}`;

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }
  
  fs.writeFileSync(path.join(outputFolder, 'page.jsx'), jsxFile);
  console.log(`Created ${componentName} page.`);
}

// Ensure apps/website/app exists
if (!fs.existsSync('apps/website/app')) {
  fs.mkdirSync('apps/website/app', { recursive: true });
}

// 1. Process pages
processFile('index.html', 'apps/website/app', 'HomePage');
processFile('companies/index.html', 'apps/website/app/companies', 'CompaniesPage');
processFile('candidates/index.html', 'apps/website/app/candidates', 'CandidatesPage');
processFile('AboutUs/index.html', 'apps/website/app/AboutUs', 'AboutUsPage');
processFile('ContactUs/index.html', 'apps/website/app/ContactUs', 'ContactUsPage');

// 2. Extract layout (Header, Footer, Head) from index.html
const indexHtml = fs.readFileSync('index.html', 'utf-8');
const headerMatch = indexHtml.match(/<header.*?<\/header>/s);
const footerMatch = indexHtml.match(/<footer.*?<\/footer>/s);
const stickyMatch = indexHtml.match(/<a class="sticky-whatsapp".*?<\/a>/s);

const headerJsx = headerMatch ? htmlToJsx(headerMatch[0]) : '';
const footerJsx = footerMatch ? htmlToJsx(footerMatch[0]) : '';
const stickyJsx = stickyMatch ? htmlToJsx(stickyMatch[0]) : '';

const layoutJsx = `import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'HireForTravel | Travel Recruitment Agency',
  description: 'HireForTravel helps travel brands hire faster.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Roboto:wght@500;700;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="page-shell">
          ${headerJsx}
          {children}
          ${footerJsx}
          ${stickyJsx}
        </div>
        <Script src="/assets/js/config.js" strategy="beforeInteractive" />
        <Script src="/assets/js/site.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
`;

fs.writeFileSync('apps/website/app/layout.jsx', layoutJsx);
console.log('Created layout.jsx');

// Copy CSS and Assets
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy assets to public folder
if (!fs.existsSync('apps/website/public')) {
  fs.mkdirSync('apps/website/public', { recursive: true });
}
copyDir('assets', 'apps/website/public/assets');

// Copy globals.css
fs.copyFileSync('assets/css/styles.css', 'apps/website/app/globals.css');
console.log('Copied assets and styles');
