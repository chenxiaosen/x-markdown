const { test } = require('node:test')
const assert = require('node:assert')
const { extractMarkdown, toFileName, parseHtml, loadFixture } = require('./helpers')

const ARTICLE_URL = 'https://example.com/news/bridges'

test('普通文章页提取正文并转 Markdown', () => {
  const { title, markdown } = extractMarkdown(loadFixture('article.html', ARTICLE_URL), ARTICLE_URL)

  assert.strictEqual(title, 'How Bridges Carry Weight')
  assert.match(markdown, /^## Three basic forms$/m)
  assert.match(markdown, /A bridge works by moving load from the deck/)
  assert.match(markdown, /\[full classification\]\(https:\/\/example\.com\/bridges\)/)
  assert.match(markdown, /^- {1,3}Beam bridges rely on bending strength$/m)
  assert.match(markdown, /^- {1,3}Suspension bridges hang the deck from cables$/m)
  assert.match(markdown, /!\[A suspension bridge at dusk\]\(https:\/\/example\.com\/images\/bridge\.png\)/)
  assert.doesNotMatch(markdown, /NAVIGATION-|SITE-BANNER|SIDEBAR-|FOOTER-/)
})

test('Readability 提取失败时退回整页 body 转换', () => {
  const url = 'https://example.com/chart'
  const { title, markdown } = extractMarkdown(loadFixture('no-article.html', url), url)

  assert.strictEqual(title, 'Chart Only Page')
  assert.match(markdown, /!\[quarterly chart\]\(https:\/\/example\.com\/chart\.png\)/)
})

test('提取过程不修改传入的 document', () => {
  const document = loadFixture('article.html', ARTICLE_URL)
  const before = document.documentElement.outerHTML
  extractMarkdown(document, ARTICLE_URL)
  assert.strictEqual(document.documentElement.outerHTML, before)
})

test('front matter 只写存在的字段', () => {
  const { markdown } = extractMarkdown(loadFixture('no-article.html', 'https://example.com/chart'), 'https://example.com/chart')

  const [open, ...rest] = markdown.split('\n')
  const end = rest.indexOf('---')
  assert.strictEqual(open, '---')
  assert.deepStrictEqual(rest.slice(0, end), [
    'title: "Chart Only Page"',
    'url: "https://example.com/chart"',
  ])
  assert.strictEqual(rest[end + 1], '')
})

test('front matter 带上 Readability 的作者与发布时间', () => {
  const { markdown } = extractMarkdown(loadFixture('article.html', ARTICLE_URL), ARTICLE_URL)

  assert.match(markdown, /^---\ntitle: "How Bridges Carry Weight"\nauthor: "Ada Lovelace"\nurl: "https:\/\/example\.com\/news\/bridges"\npublished: "2026-03-05T08:30:00Z"\n---\n\n/)
})

test('front matter 的值含引号与冒号时被转义', () => {
  const html = '<html><head><title>He said "hi": a story</title></head><body><div><img src="https://example.com/a.png" alt="a"></div></body></html>'
  const url = 'https://example.com/a?x=1:2'
  const { markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.match(markdown, /^title: "He said \\"hi\\": a story"$/m)
  assert.match(markdown, /^url: "https:\/\/example\.com\/a\?x=1:2"$/m)
})

test('文件名去掉非法字符与换行', () => {
  assert.strictEqual(toFileName('a\\b/c:d*e?f"g<h>i|j\nk\rl'), 'abcdefghijkl.md')
})

test('文件名首尾空白被去掉', () => {
  assert.strictEqual(toFileName('  hello world \n'), 'hello world.md')
})

test('超长标题截断到 80 字符', () => {
  const name = toFileName('a'.repeat(200))
  assert.strictEqual(name, 'a'.repeat(80) + '.md')
})

test('空标题兜底为 x-markdown-时间戳', () => {
  assert.match(toFileName(''), /^x-markdown-\d+\.md$/)
  assert.match(toFileName('  \n/:*  '), /^x-markdown-\d+\.md$/)
})

test('文件名去掉 Chrome 下载拒收的 ~、控制字符与格式字符', () => {
  assert.strictEqual(toFileName('涨了 ~30%'), '涨了 30%.md')
  assert.strictEqual(toFileName('a​b\tc‍d﻿e\u0000f'), 'abcdef.md')
})

test('文件名开头的点被去掉', () => {
  assert.strictEqual(toFileName('...hidden'), 'hidden.md')
})

test('截断不切开 emoji 代理对', () => {
  const name = toFileName('a'.repeat(79) + '😀b')
  assert.strictEqual(name, 'a'.repeat(79) + '😀.md')
})
