const { test } = require('node:test')
const assert = require('node:assert')
const { extractMarkdown, parseHtml, loadFixture } = require('./helpers')

const TWEET_URL = 'https://x.com/nickfloats/status/1636116996164304896'
const QUOTE_URL = 'https://x.com/dontbesilent/status/2034678354243436924'
const ARTICLE_URL = 'https://x.com/Khazix0918/article/2084919577562255639'
const ARTICLE_STATUS_URL = 'https://x.com/Khazix0918/status/2084919577562255639'
const RICH_URL = 'https://x.com/xiaomovps/status/2105516481887027446'

function extract(fixture, url) {
  return extractMarkdown(loadFixture(fixture, url), url)
}

test('推文页只输出当前这一条，不带同作者的前后推文', () => {
  const { markdown } = extract('x-tweet.html', TWEET_URL)

  assert.match(markdown, /1960s street style photo of a young woman, sitting, sailboat, green dior dress/)
  assert.match(markdown, /^v4 \(left\) v5 \(right\)$/m)
  assert.doesNotMatch(markdown, /Midjourney v5 is here|Editorial Style Photo|Crowd Shot/)
})

test('推文 front matter 带作者、规范地址与发布时间', () => {
  const { title, markdown } = extract('x-tweet.html', TWEET_URL)

  assert.strictEqual(title, 'Nick St. Pierre: 1960s street style photo of a young woman, sitting')
  assert.match(markdown, /^---\ntitle: "Nick St\. Pierre: 1960s street style photo of a young woman, sitting"\nauthor: "Nick St\. Pierre \(@nickfloats\)"\nurl: "https:\/\/x\.com\/nickfloats\/status\/1636116996164304896"\npublished: "2023-03-15T21:27:44\.000Z"\n---\n\n/)
})

test('推文图片改成 orig 原图地址且只有当前推文的两张', () => {
  const { markdown } = extract('x-tweet.html', TWEET_URL)

  const images = markdown.match(/^!\[\]\(.+\)$/gm)
  assert.deepStrictEqual(images, [
    '![](https://pbs.twimg.com/media/FrSnufhaEAAlWh6?format=jpg&name=orig)',
    '![](https://pbs.twimg.com/media/FrSnu5KacAIakHv?format=jpg&name=orig)',
  ])
})

test('地址带 /photo/1 和查询参数时仍定位到同一条推文', () => {
  const url = `${TWEET_URL}/photo/1?s=20`
  const { markdown } = extract('x-tweet.html', url)

  assert.match(markdown, /^url: "https:\/\/x\.com\/nickfloats\/status\/1636116996164304896"$/m)
  assert.doesNotMatch(markdown, /Crowd Shot/)
})

test('带引用的推文：他人回复不出现，引用推文以引用块附在正文后', () => {
  const { title, markdown } = extract('x-tweet-quote.html', QUOTE_URL)

  assert.match(title, /^dontbesilent: 1、这是我迄今为止用过的最好的 skill/)
  assert.match(markdown, /^author: "dontbesilent \(@dontbesilent\)"$/m)
  assert.match(markdown, /^3、所以，这让这个 skill 的使用体验更稀缺了$/m)
  assert.match(markdown, /^> Garry Tan \(@garrytan\)$/m)
  assert.match(markdown, /^> 我刚刚推出了 \/office-hours 技能，与 gstack 一起使用。$/m)
  assert.ok(markdown.indexOf('> Garry Tan') > markdown.indexOf('3、所以'))
  assert.doesNotMatch(markdown, /berryxia|mager|bradgessler|huhi471356|👌/)
})

test('引用推文的图片放进引用块，回复里的图片不出现', () => {
  const { markdown } = extract('x-tweet-quote.html', QUOTE_URL)

  assert.match(markdown, /^> !\[\]\(https:\/\/pbs\.twimg\.com\/media\/HDtMXBYagAASygC\?format=jpg&name=orig\)$/m)
  assert.doesNotMatch(markdown, /HD0HOQxa4AAV9ok/)
  assert.doesNotMatch(markdown, /^!\[\]/m)
})

test('推文正文里的提及链接转绝对地址，emoji 图片取 alt', () => {
  const url = 'https://x.com/ada/status/1'
  const html = `<html><head><title>t</title></head><body><article data-testid="tweet">
    <a href="/ada"><span>Ada</span></a><a href="/ada"><span>@ada</span></a>
    <div data-testid="tweetText"><span>hi </span><a href="/bob">@bob</a><span> 👍 </span><img alt="🔥" src="https://abs-0.twimg.com/emoji/v2/svg/1f525.svg"><span>a_b\nline2</span></div>
    <a href="/ada/status/1"><time datetime="2026-01-01T00:00:00.000Z">x</time></a>
  </article></body></html>`
  const { markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.match(markdown, /^hi \[@bob\]\(https:\/\/x\.com\/bob\) 👍 🔥a\\_b\nline2$/m)
})

test('推文带视频时写指向推文的视频占位', () => {
  const url = 'https://x.com/ada/status/1'
  const html = `<html><head><title>t</title></head><body><article data-testid="tweet">
    <a href="/ada"><span>Ada</span></a>
    <div data-testid="tweetText"><span>watch</span></div>
    <div data-testid="videoPlayer"><video src="blob:https://x.com/abc"></video></div>
    <a href="/ada/status/1"><time datetime="2026-01-01T00:00:00.000Z">x</time></a>
  </article></body></html>`
  const { markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.match(markdown, /^\[视频\]\(https:\/\/x\.com\/ada\/status\/1\)$/m)
})

test('没有正文的推文标题用「显示名 的推文」', () => {
  const url = 'https://x.com/ada/status/1'
  const html = `<html><head><title>t</title></head><body><article data-testid="tweet">
    <a href="/ada"><span>Ada</span></a>
    <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/AAA?format=jpg&name=medium"></div>
    <a href="/ada/status/1"><time datetime="2026-01-01T00:00:00.000Z">x</time></a>
  </article></body></html>`
  const { title, markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.strictEqual(title, 'Ada 的推文')
  assert.match(markdown, /^!\[\]\(https:\/\/pbs\.twimg\.com\/media\/AAA\?format=jpg&name=orig\)$/m)
})

test('长文 /article/ 地址走长文提取：标题、段落、代码块，无评论区', () => {
  const { title, markdown } = extract('x-article.html', ARTICLE_URL)

  assert.strictEqual(title, '开源「活人感写作.skill」，只为帮你写出没有AI味的文字。')
  assert.match(markdown, /^title: "开源「活人感写作\.skill」，只为帮你写出没有AI味的文字。"$/m)
  assert.match(markdown, /^author: "数字生命卡兹克 \(@Khazix0918\)"$/m)
  assert.match(markdown, /^url: "https:\/\/x\.com\/Khazix0918\/article\/2084919577562255639"$/m)
  assert.match(markdown, /^published: "2026-08-05T08:28:57\.000Z"$/m)
  assert.match(markdown, /^```text\n帮我安装这个skill：https:\/\/github\.com\/KKKKhazix\/human-writing\n```$/m)
  assert.doesNotMatch(markdown, /27万|^对话$/m)
})

test('长文 /status/ 地址渲染同一篇长文，正文与 /article/ 一致', () => {
  const article = extract('x-article.html', ARTICLE_URL)
  const status = extract('x-article-status.html', ARTICLE_STATUS_URL)

  assert.strictEqual(status.title, article.title)
  assert.match(status.markdown, /^author: "数字生命卡兹克 \(@Khazix0918\)"$/m)
  assert.match(status.markdown, /^url: "https:\/\/x\.com\/Khazix0918\/status\/2084919577562255639"$/m)
  assert.match(status.markdown, /^published: "2026-08-05T08:28:57\.000Z"$/m)
  assert.strictEqual(status.markdown.split('---\n\n')[1], article.markdown.split('---\n\n')[1])
  assert.doesNotMatch(status.markdown, /27万|^对话$/m)
})

test('长文里未加载的图片占位输出为指向图片页的链接，头图在正文最前', () => {
  const { markdown } = extract('x-article.html', ARTICLE_URL)

  const body = markdown.split('---\n\n')[1]
  assert.match(body, /^\[图片\]\(https:\/\/x\.com\/Khazix0918\/article\/2084919577562255639\/media\/2084919298334818304\)\n\n/)
  assert.strictEqual(body.match(/^\[图片\]\(.+\)$/gm).length, 10)
})

test('长文图片已加载时：10 张都是 orig 原图，无占位，头图在正文最前', () => {
  const { markdown } = extract('x-article-loaded.html', ARTICLE_URL)

  const body = markdown.split('---\n\n')[1]
  const images = body.match(/^!\[\]\(.+\)$/gm)
  assert.strictEqual(images.length, 10)
  assert.ok(images.every((line) => /^!\[\]\(https:\/\/pbs\.twimg\.com\/media\/[\w-]+\?format=\w+&name=orig\)$/.test(line)))
  assert.doesNotMatch(markdown, /\[图片\]\(/)
  assert.ok(body.startsWith('![](https://pbs.twimg.com/media/HO8fDjKagAAz7a2?format=jpg&name=orig)\n\n'))
})

test('长文富文本：小标题、列表、引用、粗体、斜体、链接', () => {
  const { markdown } = extract('x-article-rich.html', RICH_URL)

  assert.match(markdown, /^## 什么是 Agent Harness？（Agent Harness）$/m)
  assert.match(markdown, /^1\. {1,3}提供一组指导 AI 模型如何回应的指令/m)
  assert.match(markdown, /^2\. {1,3}描述并提供一组工具/m)
  assert.match(markdown, /^- {1,3}\S/m)
  assert.match(markdown, /^> 本文译自 Earendil Product 的 _What is a Harness\?_，/m)
  assert.match(markdown, /^\*\*Agent Harness 是一种软件，它为 AI 模型提供运行环境。\*\*与大多数 AI 模型不同/m)
  assert.match(markdown, /^软件工程师通常会在电脑的终端中直接使用 \[Pi\]\(https:\/\/pi\.dev\/\) 这样的 Harness。不过，\[OpenClaw\]\(https:\/\/openclaw\.ai\/\) 之类的/m)
  assert.doesNotMatch(markdown, /\*\*\*\*|__/)
})

test('长文里的站内相对链接转绝对地址', () => {
  const document = loadFixture('x-article-rich.html', RICH_URL)
  const paragraph = document.querySelector('[data-testid="twitterArticleRichTextView"] .longform-unstyled span span')
  paragraph.innerHTML = '<a href="/xiaomovps">墨</a>'
  const { markdown } = extractMarkdown(document, RICH_URL)

  assert.match(markdown, /\[墨\]\(https:\/\/x\.com\/xiaomovps\)/)
})

test('X 上的个人主页不属于推文或长文，退回通用提取', () => {
  const url = 'https://x.com/nickfloats'
  const html = '<html><head><title>Profile</title></head><body><div><img src="https://example.com/a.png" alt="a"></div></body></html>'
  const { title, markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.strictEqual(title, 'Profile')
  assert.match(markdown, /^---\ntitle: "Profile"\nurl: "https:\/\/x\.com\/nickfloats"\n---\n\n/)
})

for (const path of ['/i/web/status/1636116996164304896', '/i/status/1636116996164304896']) {
  test(`非规范推文地址 ${path} 只取当前推文，作者从页面解析`, () => {
    const url = `https://x.com${path}`
    const { title, markdown } = extract('x-tweet.html', url)

    assert.strictEqual(title, 'Nick St. Pierre: 1960s street style photo of a young woman, sitting')
    assert.match(markdown, /^author: "Nick St\. Pierre \(@nickfloats\)"$/m)
    assert.match(markdown, /^url: "https:\/\/x\.com\/nickfloats\/status\/1636116996164304896"$/m)
    assert.doesNotMatch(markdown, /Midjourney v5 is here|Crowd Shot|undefined/)
  })
}

test('/i/web/status/ 地址的引用推文页不带他人回复', () => {
  const { markdown } = extract('x-tweet-quote.html', 'https://x.com/i/web/status/2034678354243436924')

  assert.match(markdown, /^author: "dontbesilent \(@dontbesilent\)"$/m)
  assert.doesNotMatch(markdown, /berryxia|mager|bradgessler/)
})

test('推文页找不到当前推文时报错，不退回整页提取带出回复', () => {
  const document = loadFixture('x-tweet-quote.html', QUOTE_URL)
  document.querySelector('a[href$="/status/2034678354243436924"] time').closest('article').remove()

  assert.throws(() => extractMarkdown(document, QUOTE_URL), /未找到当前推文/)
})

test('长文地址找不到长文时报错，不退回整页提取', () => {
  const document = loadFixture('x-article.html', ARTICLE_URL)
  document.querySelector('[data-testid="twitterArticleReadView"]').remove()

  assert.throws(() => extractMarkdown(document, ARTICLE_URL), /未找到长文/)
})

test('长文缺正文节点时报明确错误', () => {
  const document = loadFixture('x-article.html', ARTICLE_URL)
  document.querySelector('[data-testid="twitterArticleRichTextView"]').remove()

  assert.throws(() => extractMarkdown(document, ARTICLE_URL), /未找到长文正文/)
})

test('长文缺标题与发布时间：标题退回页面标题，published 不写', () => {
  const document = loadFixture('x-article.html', ARTICLE_URL)
  document.title = '页面标题'
  document.querySelector('[data-testid="twitter-article-title"]').remove()
  document.querySelectorAll('time').forEach((node) => node.remove())
  const { title, markdown } = extractMarkdown(document, ARTICLE_URL)

  assert.strictEqual(title, '页面标题')
  assert.doesNotMatch(markdown, /^published:/m)
  assert.match(markdown, /^```text\n帮我安装这个skill/m)
})

test('长文作者从页面解析，不信任地址里的 handle', () => {
  const url = 'https://x.com/other/article/2084919577562255639'
  const { markdown } = extract('x-article.html', url)

  assert.match(markdown, /^author: "数字生命卡兹克 \(@Khazix0918\)"$/m)
})

test('长文地址无 handle 且页面找不到作者时不写 author', () => {
  const url = 'https://x.com/i/article/2084919577562255639'
  const document = loadFixture('x-article.html', url)
  document.querySelectorAll('a[href="/Khazix0918"]').forEach((node) => node.remove())
  const { markdown } = extractMarkdown(document, url)

  assert.doesNotMatch(markdown, /^author:|undefined/m)
})

test('找不到显示名时作者只写 @handle，不出现 undefined', () => {
  const url = 'https://x.com/ada/status/1'
  const html = `<html><head><title>t</title></head><body><article data-testid="tweet">
    <div data-testid="tweetText"><span>hi</span></div>
    <a href="/ada/status/1"><time datetime="2026-01-01T00:00:00.000Z">x</time></a>
  </article></body></html>`
  const { title, markdown } = extractMarkdown(parseHtml(html, url), url)

  assert.strictEqual(title, '@ada: hi')
  assert.match(markdown, /^author: "@ada"$/m)
})

function quoteTweet(header) {
  return `<html><head><title>t</title></head><body><article data-testid="tweet">
    <a href="/ada"><span>Ada</span></a>
    <div data-testid="tweetText"><span>main</span></div>
    <a href="/ada/status/1"><time datetime="2026-01-01T00:00:00.000Z">x</time></a>
    <div role="link"><div data-testid="User-Name">${header}</div><div data-testid="tweetText"><span>quoted</span></div></div>
  </article></body></html>`
}

for (const [label, header, line] of [
  ['RTL 显示名', '<div dir="rtl"><span>محمد</span></div><div dir="ltr"><span>@m</span></div>', '> محمد (@m)'],
  ['无 dir 显示名节点', '<span>Bob</span><span>@bob</span>', '> @bob'],
  ['无 @handle', '<div dir="ltr"><span>Bob</span></div>', '> Bob'],
  ['显示名与 handle 都没有', '<span></span>', null],
]) {
  test(`引用块头部${label}时主推文照常输出`, () => {
    const url = 'https://x.com/ada/status/1'
    const { markdown } = extractMarkdown(parseHtml(quoteTweet(header), url), url)

    assert.match(markdown, /^main$/m)
    assert.match(markdown, /^> quoted$/m)
    if (line) assert.ok(markdown.split('\n').includes(line), markdown)
    assert.doesNotMatch(markdown, /undefined|null|^> \(\)$/m)
  })
}
