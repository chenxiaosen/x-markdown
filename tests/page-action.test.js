const test = require('node:test')
const assert = require('node:assert')

function stubChrome(overrides) {
  globalThis.chrome = {
    scripting: { executeScript: async () => [{ result: {} }] },
    downloads: { download: async () => 1 },
    ...overrides,
  }
}

test('extractFromTab 返回页面内提取结果', async () => {
  const { extractFromTab } = await import('../src/page-action.js')
  const calls = []
  stubChrome({
    scripting: {
      executeScript: async (options) => {
        calls.push(options)
        return [{ result: options.files ? undefined : { markdown: '# a', fileName: 'a.md' } }]
      },
    },
  })
  assert.deepStrictEqual(await extractFromTab(7), { markdown: '# a', fileName: 'a.md' })
  assert.deepStrictEqual(calls[0].files, ['vendor/turndown.js', 'vendor/Readability.js', 'src/extract.js'])
  assert.deepStrictEqual(calls[0].target, { tabId: 7 })
  assert.deepStrictEqual(calls[1].target, { tabId: 7 })
})

test('extractFromTab 在页面返回 error 时抛出', async () => {
  const { extractFromTab } = await import('../src/page-action.js')
  stubChrome({
    scripting: { executeScript: async (options) => [{ result: options.files ? undefined : { error: '提取失败' } }] },
  })
  await assert.rejects(extractFromTab(1), { message: '提取失败' })
})

test('downloadMarkdown 生成可还原的 data URL 并带文件名', async () => {
  const { downloadMarkdown } = await import('../src/page-action.js')
  const markdown = '---\ntitle: "a#b%c"\n---\n\n# 标题 & 内容\n'
  let options
  stubChrome({ downloads: { download: async (o) => { options = o; return 1 } } })
  await downloadMarkdown(markdown, 'a.md')
  assert.ok(options.url.startsWith('data:text/markdown;charset=utf-8,'))
  assert.strictEqual(decodeURIComponent(options.url.slice('data:text/markdown;charset=utf-8,'.length)), markdown)
  assert.ok(!options.url.includes('#'))
  assert.strictEqual(options.filename, 'a.md')
})

test('copyInTab 在页面复制失败时抛出', async () => {
  const { copyInTab } = await import('../src/page-action.js')
  stubChrome({
    scripting: { executeScript: async () => [{ result: { error: '复制失败' } }] },
  })
  await assert.rejects(copyInTab(1, 'x'), { message: '复制失败' })
})
