const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { JSDOM } = require('jsdom')

globalThis.window = new JSDOM('').window
globalThis.TurndownService = require('../vendor/turndown.js')
globalThis.Readability = require('../vendor/Readability.js')

const { extractMarkdown, toFileName } = require('../src/extract.js')

function parseHtml(html, url) {
  return new JSDOM(html, { url }).window.document
}

function loadFixture(name, url) {
  return parseHtml(readFileSync(join(__dirname, 'fixtures', name), 'utf8'), url)
}

module.exports = { extractMarkdown, toFileName, parseHtml, loadFixture }
