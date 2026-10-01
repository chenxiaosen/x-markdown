(function () {
  function createTurndown() {
    return new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })
  }

  function frontMatter(fields) {
    const lines = Object.entries(fields)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    return `---\n${lines.join('\n')}\n---\n\n`
  }

  function extractGeneric(document) {
    const article = new Readability(document.cloneNode(true)).parse()
    const turndown = createTurndown()
    if (article && article.content && article.textContent.trim()) {
      return {
        title: article.title || document.title,
        author: article.byline,
        published: article.publishedTime,
        body: turndown.turndown(article.content),
      }
    }
    return { title: document.title, body: turndown.turndown(document.body) }
  }

  const BOLD = 'span[style*="font-weight: bold"]'
  const ITALIC = 'span[style*="font-style: italic"]'
  const VIDEO = '[data-testid="videoPlayer"], [data-testid="videoComponent"]'

  function createArticleTurndown() {
    const turndown = createTurndown()
    turndown.addRule('styledSpan', {
      filter: (node) => node.matches(`${BOLD}, ${ITALIC}`),
      replacement: (content, node) => {
        if (node.matches(BOLD) && !node.parentNode.closest(BOLD)) content = `**${content}**`
        if (node.matches(ITALIC) && !node.parentNode.closest(ITALIC)) content = `_${content}_`
        return content
      },
    })
    turndown.addRule('absoluteLink', {
      filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
      replacement: (content, node) => `[${content}](${node.href})`,
    })
    turndown.addRule('articleMedia', {
      filter: (node) => node.nodeName === 'SECTION' && !node.querySelector('pre'),
      replacement: (content, node) => `\n\n${mediaMarkdown(node)}\n\n`,
    })
    return turndown
  }

  function toOrig(src) {
    return src.replace(/([?&]name=)\w+/, '$1orig')
  }

  function mediaMarkdown(node) {
    const img = node.querySelector('img')
    if (img) return `![](${toOrig(img.src)})`
    const link = node.querySelector('a[href*="/media/"]')
    return link ? `[图片](${link.href})` : ''
  }

  function inlineMarkdown(node, turndown) {
    return Array.from(node.childNodes, (child) => {
      if (child.nodeType === 3) return turndown.escape(child.textContent)
      if (child.nodeName === 'IMG') return child.alt
      const text = inlineMarkdown(child, turndown)
      return child.nodeName === 'A' ? `[${text}](${child.href})` : text
    }).join('')
  }

  function displayName(scope, handle) {
    return Array.from(scope.querySelectorAll(`a[href="/${handle}" i]`), (link) => link.textContent.trim())
      .find((text) => text && text[0] !== '@')
  }

  function profileHandle(scope) {
    const link = Array.from(scope.querySelectorAll('a[href^="/"]'))
      .find((node) => node.textContent.trim().toLowerCase() === `@${node.getAttribute('href').slice(1)}`.toLowerCase())
    return link && link.getAttribute('href').slice(1)
  }

  function authorOf(scope, handle) {
    if (!handle) return {}
    const name = displayName(scope, handle)
    return { name: name || `@${handle}`, author: name ? `${name} (@${handle})` : `@${handle}` }
  }

  function publishedOf(time) {
    return time ? time.getAttribute('datetime') : undefined
  }

  function quoteMarkdown(quote, turndown) {
    const header = quote.querySelector('[data-testid="User-Name"]')
    const nameNode = header.querySelector('div[dir]')
    const displayed = nameNode && nameNode.textContent.trim()
    const handle = (/@\w+/.exec(header.textContent) || [])[0]
    const name = displayed && handle ? `${displayed} (${handle})` : displayed || handle
    const text = quote.querySelector('[data-testid="tweetText"]')
    const photos = Array.from(quote.querySelectorAll('[data-testid="tweetPhoto"] img'), (img) => `![](${toOrig(img.src)})`)
    const parts = name ? [name] : []
    if (text) parts.push(inlineMarkdown(text, turndown))
    return parts.concat(photos).join('\n\n').replace(/^/gm, '> ')
  }

  function extractTweet(document, id) {
    const tweet = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
      .find((article) => article.querySelector(`a[href$="/status/${id}"] time`))
    if (!tweet) throw new Error('未找到当前推文，请等待页面加载完成后重试')
    const time = tweet.querySelector(`a[href$="/status/${id}"] time`)
    const handle = time.closest('a').getAttribute('href').split('/')[1]
    const turndown = createTurndown()
    const url = `https://x.com/${handle}/status/${id}`
    const { name, author } = authorOf(tweet, handle)
    const quote = Array.from(tweet.querySelectorAll('div[role="link"]')).find((node) => node.querySelector('[data-testid="User-Name"]'))
    const outsideQuote = (node) => !quote || !quote.contains(node)
    const text = Array.from(tweet.querySelectorAll('[data-testid="tweetText"]')).find(outsideQuote)
    const photos = Array.from(tweet.querySelectorAll('[data-testid="tweetPhoto"] img'))
      .filter(outsideQuote)
      .map((img) => `![](${toOrig(img.src)})`)
    const hasVideo = Array.from(tweet.querySelectorAll(VIDEO)).some(outsideQuote)
    const parts = [text && inlineMarkdown(text, turndown), ...photos, hasVideo && `[视频](${url})`, quote && quoteMarkdown(quote, turndown)]
    const summary = text ? `${name}: ${text.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)}` : `${name} 的推文`
    return {
      title: summary,
      author,
      url,
      published: publishedOf(time),
      body: parts.filter(Boolean).join('\n\n'),
    }
  }

  function extractArticle(readView, pageUrl) {
    const scope = readView.closest('article[data-testid="tweet"]') || readView
    const rich = readView.querySelector('[data-testid="twitterArticleRichTextView"]')
    if (!rich) throw new Error('未找到长文正文，请等待页面加载完成后重试')
    const title = readView.querySelector('[data-testid="twitter-article-title"]')
    const urlHandle = /^\/(?!i\/)(\w+)\//.exec(pageUrl.pathname)
    const cover = Array.from(readView.querySelectorAll('a[href*="/media/"]')).find((link) => !rich.contains(link))
    const root = rich.cloneNode(true)
    root.querySelectorAll('.public-DraftStyleDefault-block, .public-DraftStyleDefault-block div')
      .forEach((node) => node.replaceWith(...node.childNodes))
    const body = createArticleTurndown().turndown(root)
    return {
      title: title ? title.textContent.trim() : readView.ownerDocument.title,
      author: authorOf(scope, profileHandle(scope) || (urlHandle && urlHandle[1])).author,
      url: pageUrl.origin + pageUrl.pathname,
      published: publishedOf(scope.querySelector('time')),
      body: cover ? `${mediaMarkdown(cover.parentNode)}\n\n${body}` : body,
    }
  }

  function extractX(document, url) {
    const pageUrl = new URL(url)
    const status = /\/status\/(\d+)/.exec(pageUrl.pathname)
    if (!status && !/\/article\/\d+/.test(pageUrl.pathname)) return null
    const readView = document.querySelector('[data-testid="twitterArticleReadView"]')
    if (readView) return extractArticle(readView, pageUrl)
    if (status) return extractTweet(document, status[1])
    throw new Error('未找到长文内容，请等待页面加载完成后重试')
  }

  function extractMarkdown(document, url) {
    const host = new URL(url).hostname
    const isX = host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com')
    const page = (isX && extractX(document, url)) || { ...extractGeneric(document), url }
    return {
      title: page.title,
      markdown: frontMatter({ title: page.title, author: page.author, url: page.url, published: page.published }) + page.body,
    }
  }

  function toFileName(title) {
    const cleaned = title.replace(/[\\/:*?"<>|~\p{Cc}\p{Cf}\p{Cs}]/gu, '').replace(/^[.\s]+/, '').trim()
    const name = Array.from(cleaned).slice(0, 80).join('').trim()
    return `${name || `x-markdown-${Date.now()}`}.md`
  }

  const XMarkdown = { extractMarkdown, toFileName }
  if (typeof module === 'object') module.exports = XMarkdown
  else globalThis.XMarkdown = XMarkdown
})()
