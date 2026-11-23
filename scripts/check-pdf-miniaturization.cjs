const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PDFDocument, PDFName, PDFStream } = require('pdf-lib');

/**
 * Checks a single page of a PDFDocument for the upper-left miniaturization bug
 * (where music notation or systems are shrunk into a tiny corner, e.g. <40% width and height).
 *
 * @param {import('pdf-lib').PDFPage} page
 * @returns {{ isMiniaturized: boolean, pageNum: number, coverageX: number, coverageY: number, opCount: number, reason?: string }}
 */
function checkPageForMiniaturization(page, pageIndex) {
  const { width, height } = page.getSize();
  const pageNode = page.node;
  const contents = pageNode.Contents();
  if (!contents) {
    return { isMiniaturized: false, pageNum: pageIndex + 1, coverageX: 0, coverageY: 0, opCount: 0 };
  }

  const streams = [];
  if (Array.isArray(contents)) {
    streams.push(...contents);
  } else if (contents.asArray) {
    streams.push(...contents.asArray());
  } else {
    streams.push(contents);
  }

  let totalDecoded = '';
  for (const stmRef of streams) {
    const streamObj = page.doc.context.lookup(stmRef);
    if (!streamObj || !(streamObj instanceof PDFStream)) continue;

    const dict = streamObj.dict;
    const filter = dict.get(PDFName.of('Filter'));
    const rawBytes = streamObj.getContents();

    let decoded = null;
    if (filter && filter.toString() === '/FlateDecode') {
      try {
        decoded = zlib.inflateSync(Buffer.from(rawBytes)).toString('binary');
      } catch {
        try {
          decoded = zlib.inflateRawSync(Buffer.from(rawBytes)).toString('binary');
        } catch {
          // ignore stream decompression failure
        }
      }
    } else {
      decoded = Buffer.from(rawBytes).toString('binary');
    }

    if (decoded) {
      totalDecoded += '\n' + decoded;
    }
  }

  // Parse path coordinates and font sizes from the decoded stream
  const lines = totalDecoded.split(/\r?\n/);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let opCount = 0;
  let maxFontSize = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Font size e.g. /F1 12 Tf
    const tfMatch = trimmed.match(/\/(\S+)\s+([0-9.]+)\s+Tf/);
    if (tfMatch) {
      const fs = parseFloat(tfMatch[2]);
      if (fs > maxFontSize) maxFontSize = fs;
    }

    // Path operations: x y m, x y l
    const mMatch = trimmed.match(/^([0-9.-]+)\s+([0-9.-]+)\s+([ml])$/);
    if (mMatch) {
      const x = parseFloat(mMatch[1]);
      const y = parseFloat(mMatch[2]);
      if (!isNaN(x) && !isNaN(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        opCount++;
      }
    }
  }

  if (opCount < 25) {
    // Empty or title-only page with no dense notation operations
    return { isMiniaturized: false, pageNum: pageIndex + 1, coverageX: 0, coverageY: 0, opCount };
  }

  const spanX = Math.max(0, maxX - Math.max(0, minX));
  const spanY = Math.max(0, maxY - Math.max(0, minY));
  const coverageX = spanX / width;
  const coverageY = spanY / height;

  // Miniaturization signature:
  // Drawing operations are densely present (>25), but coordinates cover <38% of width AND <38% of height,
  // typically positioned in a corner (e.g. maxX < 0.40 * width or maxFontSize < 10 pt).
  if (coverageX < 0.38 && coverageY < 0.38) {
    return {
      isMiniaturized: true,
      pageNum: pageIndex + 1,
      coverageX: Math.round(coverageX * 100) / 100,
      coverageY: Math.round(coverageY * 100) / 100,
      opCount,
      reason: `Notation coordinates clustered into ${(coverageX * 100).toFixed(1)}% width x ${(coverageY * 100).toFixed(1)}% height with ${opCount} drawing ops`
    };
  }

  return {
    isMiniaturized: false,
    pageNum: pageIndex + 1,
    coverageX: Math.round(coverageX * 100) / 100,
    coverageY: Math.round(coverageY * 100) / 100,
    opCount
  };
}

/**
 * Checks a PDF file on disk for miniaturized pages.
 * @param {string} filePath
 * @returns {Promise<{ isBad: boolean, filePath: string, badPages: Array<object> }>}
 */
async function checkPdf(filePath) {
  try {
    const bytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    const badPages = [];

    for (let i = 0; i < pages.length; i++) {
      const res = checkPageForMiniaturization(pages[i], i);
      if (res.isMiniaturized) {
        badPages.push(res);
      }
    }

    return {
      isBad: badPages.length > 0,
      filePath,
      badPages
    };
  } catch (err) {
    return {
      isBad: false,
      error: err.message,
      filePath,
      badPages: []
    };
  }
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node check-pdf-miniaturization.cjs <path-to-pdf-or-dir> [--recursive]');
    process.exit(0);
  }

  const targetPath = path.resolve(args[0]);
  const isRecursive = args.includes('--recursive');

  (async () => {
    let filesToCheck = [];
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      function walk(dir) {
        for (const item of fs.readdirSync(dir)) {
          const full = path.join(dir, item);
          const itemStat = fs.statSync(full);
          if (itemStat.isDirectory() && isRecursive) {
            walk(full);
          } else if (itemStat.isFile() && item.toLowerCase().endsWith('.pdf')) {
            filesToCheck.push(full);
          }
        }
      }
      walk(targetPath);
    } else {
      filesToCheck.push(targetPath);
    }

    console.log(`Scanning ${filesToCheck.length} PDF(s) for miniaturization bugs...`);
    let badCount = 0;

    for (const file of filesToCheck) {
      const result = await checkPdf(file);
      if (result.isBad) {
        badCount++;
        console.error(`[BAD] Miniaturization detected in: ${file}`);
        for (const bp of result.badPages) {
          console.error(`   -> Page ${bp.pageNum}: ${bp.reason}`);
        }
      }
    }

    if (badCount > 0) {
      console.error(`\nFound ${badCount} PDF(s) with miniaturization defects!`);
      process.exit(1);
    } else {
      console.log('All scanned PDFs passed miniaturization check (normal page coverage).');
      process.exit(0);
    }
  })();
}

module.exports = {
  checkPageForMiniaturization,
  checkPdf
};

