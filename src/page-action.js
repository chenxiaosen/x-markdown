async function runInTab(tabId, func, args) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func, args })
  if (result.error) throw new Error(result.error)
  return result
}

function extractInPage() {
  try {
    const { title, markdown } = XMarkdown.extractMarkdown(document, location.href)
    return { markdown, fileName: XMarkdown.toFileName(title) }
  } catch (error) {
    return { error: error.message }
  }
}

async function copyInPage(text) {
  try {
    await navigator.clipboard.writeText(text)
    return {}
  } catch (error) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    return copied ? {} : { error: `复制失败：${error.message}` }
  }
}

export async function extractFromTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['vendor/turndown.js', 'vendor/Readability.js', 'src/extract.js'],
  })
  return runInTab(tabId, extractInPage, [])
}

export async function copyInTab(tabId, markdown) {
  await runInTab(tabId, copyInPage, [markdown])
}

export async function downloadMarkdown(markdown, fileName) {
  await chrome.downloads.download({
    url: `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`,
    filename: fileName,
  })
}
